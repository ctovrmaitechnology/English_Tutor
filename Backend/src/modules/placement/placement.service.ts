import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionBank, QuestionSet } from './entities/question-bank.entity';
import { PlacementAttempt, PlacementLevel } from './entities/placement-attempt.entity';
import { PlacementTest } from './entities/placement-test.entity';
import { PlacementResponse } from './entities/placement-response.entity';
import { GeminiService } from '../gemini/gemini.service';
import { User } from '../users/user.entity';

const ALL_SETS: QuestionSet[] = ['A', 'B', 'C'];
const SKILLS = ['grammar', 'vocabulary', 'reading', 'listening'] as const;

/** One question, shaped for the client — never includes the correct answer. */
export interface QuestionForClient {
  questionId: string;
  orderInSet: number; // 1-based position within the set
  section: string;
  sectionTitle: string;
  marks: number;
  questionType: string;
  skill: string;
  questionText: string;
  /** Only present for questionType='mcq'. */
  options?: string[];
  /** Only present for reading-comprehension-style questions. */
  passage?: string;
  /** How the user should respond: typed text, or recorded audio. */
  responseMode: string;
  /** Script text for browser TTS playback. Only present for listening questions. */
  audioScript?: string;
  /** Max number of times the client should allow playback. Only present for listening questions. */
  maxPlays?: number;
}

export interface StartPayload {
  attemptId: string;
  totalQuestions: number;
  resumeAtIndex: number; // 0-based; where to resume if reloading mid-attempt
  questions: QuestionForClient[];
  assignedSet?: string;
}

export interface PlacementResult {
  attemptId: string;
  totalScore: number;
  skillScores: Record<string, number>;
  finalLevel: PlacementLevel;
  confidenceScore: number;
  completedAt?: Date | string;
  responses?: any[];
}

/**
 * Selection model: 3 fixed, pre-authored, difficulty-balanced parallel
 * "forms" (Set A / B / C). One whole set is assigned per user at
 * attempt-start (round-robin, avoiding the most recently used set on a
 * retake) and returned to the client IN FULL, in fixed order.
 *
 * Why the whole set is returned upfront (not one question per request):
 * the set is short and fixed, so there's no adaptive branching that would
 * require asking the server "what's next" — the frontend already knows.
 * This lets question-to-question navigation be fully local (0 network
 * calls), while each answer is still saved to the server individually and
 * asynchronously, so a crash mid-test only risks the one answer that was
 * in flight, not the whole attempt.
 */
@Injectable()
export class PlacementService implements OnModuleInit {
  private readonly logger = new Logger(PlacementService.name);

  constructor(
    @InjectRepository(QuestionBank)
    private readonly questionRepo: Repository<QuestionBank>,
    @InjectRepository(PlacementAttempt)
    private readonly attemptRepo: Repository<PlacementAttempt>,
    @InjectRepository(PlacementResponse)
    private readonly responseRepo: Repository<PlacementResponse>,
    @InjectRepository(PlacementTest)
    private readonly testRepo: Repository<PlacementTest>,
    private readonly gemini: GeminiService,
  ) { }

  async onModuleInit() {
    const count = await this.questionRepo.count();
    this.logger.log(`Placement question bank count on startup: ${count}`);
    if (count < 90) {
      this.logger.log('Placement question bank is incomplete. Seeding basic questions...');
      // Clear existing to avoid partial sets
      if (count > 0) {
        await this.questionRepo.clear();
      }
      
      const defaultSets: QuestionSet[] = ['A', 'B', 'C'];
      const skills = ['grammar', 'vocabulary', 'reading', 'listening', 'speaking'];
      const questionsToSave = [];
      
      for (const set of defaultSets) {
        for (const skill of skills) {
          for (let i = 0; i < 6; i++) { // 6 questions per skill = 30 per set
            const isAudio = skill === 'listening' || skill === 'speaking';
            questionsToSave.push(this.questionRepo.create({
              set,
              type: skill,
              questionText: isAudio ? `Please ${skill === 'listening' ? 'listen and transcribe' : 'read aloud'} this sample for Set ${set}, question ${i + 1}.` : `Sample ${skill} question ${i + 1} for Set ${set}`,
              options: isAudio ? [] : ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
              answer: isAudio ? `Sample transcript ${i+1}` : 'Option 1'
            }));
          }
        }
      }
      
      await this.questionRepo.save(questionsToSave);
      this.logger.log(`Seeded ${questionsToSave.length} placement questions.`);
    }
  }

  // ── START ──────────────────────────────────────────────────────────
  async startAttempt(userId: string, username: string): Promise<StartPayload> {
    const existing = await this.attemptRepo.findOne({
      where: { userId, status: 'in_progress' },
      order: { startedAt: 'DESC' },
    });

    let lastSetUsed: QuestionSet | undefined;

    if (existing) {
      // Abandon the incomplete attempt and rotate to another question set
      existing.status = 'abandoned' as any;
      await this.attemptRepo.save(existing);
      lastSetUsed = existing.assignedSet as QuestionSet;
    } else {
      const priorAttempts = await this.attemptRepo.find({
        where: { userId },
        order: { startedAt: 'DESC' },
        take: 1,
        select: ['assignedSet'],
      });
      lastSetUsed = priorAttempts[0]?.assignedSet as QuestionSet;
    }

    const assignedSet = await this.assignSet(userId, lastSetUsed);
    const questions = await this.getActiveSetQuestions(assignedSet);

    if (questions.length === 0) {
      throw new NotFoundException(
        `Question set "${assignedSet}" has no active questions loaded. Cannot start assessment.`,
      );
    }

    const priorCount = await this.attemptRepo.count({ where: { userId } });

    const attempt = this.attemptRepo.create({
      userId,
      attemptNumber: priorCount + 1,
      status: 'in_progress',
      assignedSet,
      totalQuestions: questions.length,
      currentQuestionIndex: 0,
    });
    await this.attemptRepo.save(attempt);

    console.log(`\n🎯 PLACEMENT TEST STARTED\nUser Name : ${username}\nSet       : ${assignedSet}\n`);

    return {
      attemptId: attempt.id,
      totalQuestions: questions.length,
      resumeAtIndex: 0,
      questions: questions.map((q, i) => this.toClientShape(q, i)),
      assignedSet,
    };
  }

  private async buildStartPayload(attempt: PlacementAttempt): Promise<StartPayload> {
    const questions = await this.getActiveSetQuestions(attempt.assignedSet);
    return {
      attemptId: attempt.id,
      totalQuestions: attempt.totalQuestions,
      resumeAtIndex: attempt.currentQuestionIndex,
      questions: questions.map((q, i) => this.toClientShape(q, i)),
      assignedSet: attempt.assignedSet,
    };
  }

  /**
   * Assigns a unique question set (Set A, Set B, Set C) for the user,
   * avoiding sets the user has already taken in prior attempts.
   */
  private async assignSet(userId: string, excludeSet?: QuestionSet): Promise<QuestionSet> {
    // Find all sets this specific user has previously used
    const userAttempts = await this.attemptRepo.find({
      where: { userId },
      order: { startedAt: 'DESC' },
      select: ['assignedSet'],
    });

    const usedSets = new Set(userAttempts.map(a => a.assignedSet).filter(Boolean));

    // Find the first set in ALL_SETS ('A', 'B', 'C') that the user has NEVER taken before
    const unusedSet = ALL_SETS.find(s => !usedSets.has(s as QuestionSet));
    if (unusedSet) {
      return unusedSet as QuestionSet;
    }

    // If user has taken all sets (A, B, C), rotate to a set NOT used in their latest attempt
    const lastUserSet = userAttempts[0]?.assignedSet || excludeSet;
    const available = ALL_SETS.filter(s => s !== lastUserSet);
    const assignedSet = available[Math.floor(Math.random() * available.length)] || ALL_SETS[0];

    return assignedSet as QuestionSet;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private async getActiveSetQuestions(setName: QuestionSet): Promise<QuestionBank[]> {
    let questions = await this.questionRepo.find({
      where: { set: setName },
    });

    if (!questions || questions.length === 0) {
      questions = await this.questionRepo.find();
    }

    // Group by skill and order sequentially: grammar -> vocabulary -> reading -> listening -> speaking
    const skillOrder = ['grammar', 'vocabulary', 'reading', 'listening', 'speaking'];
    const grouped: Record<string, QuestionBank[]> = {};

    for (const q of questions) {
      const s = q.type?.toLowerCase() || 'grammar';
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(q);
    }

    const ordered: QuestionBank[] = [];
    for (const skill of skillOrder) {
      if (grouped[skill] && grouped[skill].length > 0) {
        ordered.push(...this.shuffleArray(grouped[skill]));
      }
    }

    for (const key in grouped) {
      if (!skillOrder.includes(key) && grouped[key].length > 0) {
        ordered.push(...this.shuffleArray(grouped[key]));
      }
    }

    return ordered.length > 0 ? ordered : this.shuffleArray(questions);
  }

  private async getSkillTotalsForSet(setName: QuestionSet): Promise<Record<string, number>> {
    const rows = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.skill_type', 'skill')
      .addSelect('COUNT(*)', 'count')
      .where('q.set_code = :setName', { setName })
      .groupBy('q.skill_type')
      .getRawMany();

    const totals: Record<string, number> = {};
    for (const row of rows) {
      totals[row.skill] = parseInt(row.count, 10);
    }
    return totals;
  }

  /**
   * Direct normalization & keyword overlap comparison for free-text/spoken responses
   * against the database model answer without external AI latency or API calls.
   */
  private scoreFreeTextResponse(transcript: string, modelAnswer: string): boolean {
    if (!transcript || !transcript.trim() || !modelAnswer) return false;

    // Clean and normalize both strings (lowercase, strip punctuation)
    const cleanTranscript = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const cleanModel = modelAnswer.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    if (!cleanTranscript || !cleanModel) return false;

    // Exact or substring match
    if (cleanTranscript === cleanModel || cleanTranscript.includes(cleanModel) || cleanModel.includes(cleanTranscript)) {
      return true;
    }

    // Word overlap accuracy match (60%+ ratio of expected words)
    const modelWords = cleanModel.split(/\s+/).filter(Boolean);
    const transcriptWords = cleanTranscript.split(/\s+/).filter(Boolean);

    if (modelWords.length === 0) return false;

    let matchedCount = 0;
    for (const word of modelWords) {
      if (transcriptWords.includes(word)) {
        matchedCount++;
      }
    }

    const matchRatio = matchedCount / modelWords.length;
    return matchRatio >= 0.6;
  }

  private toClientShape(question: QuestionBank, index: number): QuestionForClient {
    const isAudio = question.type === 'speaking' || question.type === 'listening';
    return {
      questionId: question.id,
      orderInSet: index + 1,
      section: question.type.toUpperCase(),
      sectionTitle: question.type.charAt(0).toUpperCase() + question.type.slice(1),
      marks: 1,
      questionType: question.options && question.options.length > 0 ? 'mcq' : 'free_text',
      skill: question.type,
      questionText: question.questionText,
      options: question.options && question.options.length > 0 ? question.options : undefined,
      responseMode: isAudio ? 'audio' : 'text',
      audioScript: question.type === 'listening' ? question.answer : undefined,
    };
  }

  // ── ANSWER (background save, one question at a time) ────────────────
  /**
   * Records a single answer. Called by the frontend in the background as
   * the user moves through the LOCALLY held question list — this endpoint
   * does not return "the next question" (the frontend already has it), it
   * only confirms the save. Idempotent: re-submitting the same question
   * for the same attempt is a no-op, not an error, so retries are safe.
   *
   * Handles two shapes depending on the question's type:
   *  - MCQ: `selectedOptionIndex` is required, scored immediately.
   *  - Everything else (fill_blank, spoken_dialogue, free_text, etc.):
   *    `textResponse` is stored as-is, NOT scored yet (isScored=false).
   *    Scoring these requires exact-match logic or AI/human grading that
   *    doesn't exist yet — see PlacementQuestion class doc.
   */
  async submitAnswer(
    userId: string,
    attemptId: string,
    questionId: string,
    selectedOptionIndex?: number,
    responseTimeMs?: number,
    textResponse?: string,
  ): Promise<{ saved: true }> {
    const attempt = await this.attemptRepo.findOne({ where: { id: attemptId, userId } });
    if (!attempt) throw new NotFoundException('Attempt not found.');
    if (attempt.status !== 'in_progress') {
      throw new ConflictException(`Attempt is already ${attempt.status}.`);
    }

    const question = await this.questionRepo.findOne({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Question not found.');
    const questions = await this.getActiveSetQuestions(attempt.assignedSet as QuestionSet);
    const questionOrderIndex = questions.findIndex(q => q.id === question.id);
    if (questionOrderIndex === -1) {
      throw new BadRequestException("This question does not belong to the attempt's assigned set.");
    }

    const alreadyAnswered = await this.responseRepo.findOne({ where: { attemptId, questionId } });
    if (alreadyAnswered) {
      return { saved: true }; // idempotent: retry of an already-saved answer is a success, not an error
    }

    let isScored = false;
    let isCorrect: boolean | null = null;
    let storedOptionIndex: number | null = null;
    let storedTextResponse: string | null = null;

    const isMcq = question.options && question.options.length > 0;

    if (isMcq) {
      if (
        selectedOptionIndex === undefined ||
        selectedOptionIndex < 0 ||
        selectedOptionIndex >= question.options.length
      ) {
        throw new BadRequestException('selectedOptionIndex out of range for this MCQ question.');
      }
      storedOptionIndex = selectedOptionIndex;
      isCorrect = question.options[selectedOptionIndex] === question.answer;
      isScored = true;
    } else if (question.answer) {
      // Graded against database question answer directly (0 AI API calls)
      storedTextResponse = textResponse ?? null;
      isScored = true;
      isCorrect = this.scoreFreeTextResponse(textResponse ?? '', question.answer);
    } else {
      // Other non-MCQ types with no model answer to grade against — still unscored.
      storedTextResponse = textResponse ?? null;
      isScored = false;
      isCorrect = null;
    }

    await this.responseRepo.save(
      this.responseRepo.create({
        attemptId,
        questionId,
        questionOrder: questionOrderIndex,
        selectedOptionIndex: storedOptionIndex,
        textResponse: storedTextResponse,
        isScored,
        isCorrect,
        difficultyAtTime: 1, // Defaulting as QuestionBank has no difficulty
        skill: question.type,
        responseTimeMs: responseTimeMs ?? null,
      }),
    );

    // Track furthest-reached position for accurate resume-on-refresh, even
    // though the frontend is navigating locally and out of strict lockstep
    // with each save's completion.
    const oneBasedOrder = questionOrderIndex + 1;
    if (oneBasedOrder > attempt.currentQuestionIndex) {
      attempt.currentQuestionIndex = oneBasedOrder;
      await this.attemptRepo.save(attempt);
    }

    return { saved: true };
  }

  // ── FINISH ─────────────────────────────────────────────────────────
  /**
   * Called once, when the user finishes the last question. Verifies all
   * questions in the set have a saved response (covers the case where a
   * background save for an earlier question is still retrying) before
   * scoring — if any are missing, waits are the CALLER's responsibility
   * (frontend should ensure all saves settled before calling finish);
   * this method itself just scores whatever has been recorded.
   */
  async finishAttempt(userId: string, attemptId: string, answers?: any[]): Promise<PlacementResult> {
    const attempt = await this.attemptRepo.findOne({ where: { id: attemptId, userId } });
    if (!attempt) throw new NotFoundException('Attempt not found.');

    if (attempt.status === 'completed') {
      return this.getResult(userId, attemptId); // idempotent: finishing twice just returns the same result
    }
    if (attempt.status !== 'in_progress') {
      throw new ConflictException(`Attempt is already ${attempt.status}.`);
    }

    // Process bulk cached answers JSON payload on final submission
    if (answers && Array.isArray(answers) && answers.length > 0) {
      for (const item of answers) {
        if (!item.questionId) continue;
        try {
          await this.submitAnswer(
            userId,
            attemptId,
            item.questionId,
            item.selectedOptionIndex,
            undefined,
            item.textResponse,
          );
        } catch {
          // Continue gracefully if answer was already recorded
        }
      }
    }

    return this.finalizeAttempt(attempt);
  }

  private async finalizeAttempt(attempt: PlacementAttempt): Promise<PlacementResult> {
    const allResponses = await this.responseRepo.find({ where: { attemptId: attempt.id } });

    if (allResponses.length === 0) {
      throw new ConflictException('Cannot finish an attempt with no recorded answers.');
    }

    const scoredResponses = allResponses.filter((r) => r.isScored);

    if (scoredResponses.length === 0) {
      throw new ConflictException(
        'Cannot compute a placement score: no scorable responses were recorded for this attempt.',
      );
    }

    const totalCorrect = scoredResponses.filter((r) => r.isCorrect).length;
    const totalScore = Math.round((totalCorrect / attempt.totalQuestions) * 100);
    const level = totalScore < 50 ? 'BEGINNER' : 'INTERMEDIATE';

    // Fetch questions to build meta data
    const questions = await this.getActiveSetQuestions(attempt.assignedSet as QuestionSet);

    const metaScoreData = allResponses.map(r => {
      const q = questions.find(question => question.id === r.questionId);
      return {
        questionId: r.questionId,
        questionText: q?.questionText || 'Unknown question',
        skill: r.skill,
        isCorrect: r.isCorrect,
        userAnswer: r.selectedOptionIndex !== null && q?.options ? q.options[r.selectedOptionIndex] : (r.textResponse || '(No answer)'),
        correctAnswer: q?.answer || 'Unknown answer',
      };
    });

    attempt.totalScore = totalScore;
    attempt.finalLevel = level as any;
    attempt.status = 'completed';
    attempt.completedAt = new Date();
    await this.attemptRepo.save(attempt);

    // Save into the new PlacementTest entity
    const placementTest = this.testRepo.create({
      userId: attempt.userId,
      score: totalScore,
      level: level,
      metaScoreData: metaScoreData,
    });
    await this.testRepo.save(placementTest);




    this.logger.log(`Attempt ${attempt.id} completed: score=${totalScore} level=${level}`);

    // Return the result
    return {
      attemptId: attempt.id,
      totalScore: totalScore,
      skillScores: {},
      finalLevel: level as any,
      confidenceScore: 100,
      responses: metaScoreData,
    };
  }

  // ── RESULT & REPORTS ────────────────────────────────────────────────
  async getResult(userId: string, attemptId: string, includeResponses = false): Promise<PlacementResult> {
    // attemptId was from the old system, we just get the latest test result for the user.
    const test = await this.testRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!test) throw new NotFoundException('Placement test result not found.');

    return {
      attemptId: test.id,
      totalScore: test.score,
      skillScores: {},
      finalLevel: test.level as any,
      confidenceScore: 100,
      completedAt: test.createdAt,
      ...(includeResponses ? { responses: test.metaScoreData } : {}),
    };
  }

  async getMyLatestResult(userId: string): Promise<PlacementResult | null> {
    const attempt = await this.attemptRepo.findOne({
      where: { userId, status: 'completed' },
      order: { completedAt: 'DESC' },
    });
    if (!attempt) return null;
    return this.getResult(userId, attempt.id, true);
  }

  async getLatestReport(userId: string): Promise<PlacementResult> {
    const res = await this.getMyLatestResult(userId);
    if (!res) {
      throw new NotFoundException('No completed assessment report found.');
    }
    return res;
  }

  async getReport(userId: string, attemptId: string): Promise<PlacementResult> {
    return this.getResult(userId, attemptId, true);
  }
}
