import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlacementQuestion, QuestionSet } from './entities/placement-question.entity';
import { PlacementAttempt, PlacementLevel } from './entities/placement-attempt.entity';
import { PlacementResponse } from './entities/placement-response.entity';

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
}

/** Full payload returned by /start — everything the frontend needs to run the whole test locally. */
export interface StartPayload {
  attemptId: string;
  totalQuestions: number;
  resumeAtIndex: number; // 0-based; where to resume if reloading mid-attempt
  questions: QuestionForClient[];
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
export class PlacementService {
  private readonly logger = new Logger(PlacementService.name);

  constructor(
    @InjectRepository(PlacementQuestion)
    private readonly questionRepo: Repository<PlacementQuestion>,
    @InjectRepository(PlacementAttempt)
    private readonly attemptRepo: Repository<PlacementAttempt>,
    @InjectRepository(PlacementResponse)
    private readonly responseRepo: Repository<PlacementResponse>,
  ) {}

  // ── START ──────────────────────────────────────────────────────────
  async startAttempt(userId: string): Promise<StartPayload> {
    const existing = await this.attemptRepo.findOne({
      where: { userId, status: 'in_progress' },
      order: { startedAt: 'DESC' },
    });

    if (existing) {
      this.logger.log(`Resuming in-progress attempt ${existing.id} (set ${existing.assignedSet}) for user ${userId}`);
      return this.buildStartPayload(existing);
    }

    const priorAttempts = await this.attemptRepo.find({
      where: { userId, status: 'completed' },
      order: { completedAt: 'DESC' },
      take: 1,
      select: ['assignedSet'],
    });
    const lastSetUsed = priorAttempts[0]?.assignedSet;

    const assignedSet = await this.assignSet(userId, lastSetUsed);
    const questions = await this.getActiveSetQuestions(assignedSet);

    if (questions.length === 0) {
      throw new NotFoundException(
        `Question set "${assignedSet}" has no active questions loaded. Cannot start assessment.`,
      );
    }

    const attempt = this.attemptRepo.create({
      userId,
      attemptNumber: priorAttempts.length + 1,
      status: 'in_progress',
      assignedSet,
      totalQuestions: questions.length,
      currentQuestionIndex: 0,
    });
    await this.attemptRepo.save(attempt);

    this.logger.log(
      `Started attempt ${attempt.id} (#${attempt.attemptNumber}, set ${assignedSet}, ${questions.length} questions) for user ${userId}`,
    );

    return {
      attemptId: attempt.id,
      totalQuestions: questions.length,
      resumeAtIndex: 0,
      questions: questions.map((q) => this.toClientShape(q)),
    };
  }

  private async buildStartPayload(attempt: PlacementAttempt): Promise<StartPayload> {
    const questions = await this.getActiveSetQuestions(attempt.assignedSet);
    return {
      attemptId: attempt.id,
      totalQuestions: attempt.totalQuestions,
      resumeAtIndex: attempt.currentQuestionIndex,
      questions: questions.map((q) => this.toClientShape(q)),
    };
  }

  /**
   * Round-robin set assignment based on the user's total attempt count, so
   * repeat test-takers cycle evenly through A/B/C. On retake, explicitly
   * excludes the most recently used set.
   */
  private async assignSet(userId: string, excludeSet?: QuestionSet): Promise<QuestionSet> {
    const totalAttempts = await this.attemptRepo.count({ where: { userId } });
    const candidates = excludeSet ? ALL_SETS.filter((s) => s !== excludeSet) : ALL_SETS;
    const index = totalAttempts % candidates.length;
    return candidates[index];
  }

  private async getActiveSetQuestions(setName: QuestionSet): Promise<PlacementQuestion[]> {
    return this.questionRepo.find({
      where: { status: 'active', setName },
      order: { orderInSet: 'ASC' },
    });
  }

  private toClientShape(question: PlacementQuestion): QuestionForClient {
    return {
      questionId: question.id,
      orderInSet: question.orderInSet,
      section: question.section,
      sectionTitle: question.sectionTitle,
      marks: question.marks,
      questionType: question.questionType,
      skill: question.skill,
      questionText: question.questionText,
      options: question.options ?? undefined, // only present for MCQ
      passage: question.passage ?? undefined,
      responseMode: question.responseMode,
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
    if (question.setName !== attempt.assignedSet) {
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

    if (question.questionType === 'mcq') {
      if (
        selectedOptionIndex === undefined ||
        !question.options ||
        selectedOptionIndex < 0 ||
        selectedOptionIndex >= question.options.length
      ) {
        throw new BadRequestException('selectedOptionIndex out of range for this MCQ question.');
      }
      storedOptionIndex = selectedOptionIndex;
      isCorrect = selectedOptionIndex === question.correctOptionIndex;
      isScored = true;
    } else {
      // Non-MCQ: accept whatever text response was given (may be empty if
      // the user skipped a not-yet-gradeable question); never scored yet.
      storedTextResponse = textResponse ?? null;
      isScored = false;
      isCorrect = null;
    }

    await this.responseRepo.save(
      this.responseRepo.create({
        attemptId,
        questionId,
        questionOrder: question.orderInSet - 1,
        selectedOptionIndex: storedOptionIndex,
        textResponse: storedTextResponse,
        isScored,
        isCorrect,
        difficultyAtTime: question.difficulty,
        skill: question.skill,
        responseTimeMs: responseTimeMs ?? null,
      }),
    );

    // Track furthest-reached position for accurate resume-on-refresh, even
    // though the frontend is navigating locally and out of strict lockstep
    // with each save's completion.
    if (question.orderInSet > attempt.currentQuestionIndex) {
      attempt.currentQuestionIndex = question.orderInSet;
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
  async finishAttempt(userId: string, attemptId: string): Promise<PlacementResult> {
    const attempt = await this.attemptRepo.findOne({ where: { id: attemptId, userId } });
    if (!attempt) throw new NotFoundException('Attempt not found.');

    if (attempt.status === 'completed') {
      return this.getResult(userId, attemptId); // idempotent: finishing twice just returns the same result
    }
    if (attempt.status !== 'in_progress') {
      throw new ConflictException(`Attempt is already ${attempt.status}.`);
    }

    return this.finalizeAttempt(attempt);
  }

  private async finalizeAttempt(attempt: PlacementAttempt): Promise<PlacementResult> {
    const allResponses = await this.responseRepo.find({ where: { attemptId: attempt.id } });

    if (allResponses.length === 0) {
      throw new ConflictException('Cannot finish an attempt with no recorded answers.');
    }

    // Only scored responses (currently: MCQ) count toward the placement
    // score. Non-MCQ responses (fill_blank, spoken_dialogue, free_text,
    // etc.) are still saved above and available in placement_responses for
    // later review/grading, but must NOT affect the score until real
    // scoring logic exists for them — including them as "wrong answers"
    // would unfairly tank every user's result.
    const scoredResponses = allResponses.filter((r) => r.isScored);

    if (scoredResponses.length === 0) {
      throw new ConflictException(
        'Cannot compute a placement score: no auto-scorable (MCQ) responses were recorded for this attempt.',
      );
    }

    const skillScores: Record<string, number> = {};
    for (const skill of SKILLS) {
      const skillResponses = scoredResponses.filter((r) => r.skill === skill);
      if (skillResponses.length === 0) {
        skillScores[skill] = 0;
        continue;
      }
      const correct = skillResponses.filter((r) => r.isCorrect).length;
      skillScores[skill] = Math.round((correct / skillResponses.length) * 100);
    }

    const totalCorrect = scoredResponses.filter((r) => r.isCorrect).length;
    const totalScore = Math.round((totalCorrect / scoredResponses.length) * 100);

    const { finalLevel, confidenceScore } = this.computePlacement(
      totalScore,
      skillScores,
      scoredResponses.length,
      scoredResponses.length, // denominator is scorable questions only, not the full 86
    );

    attempt.totalScore = totalScore;
    attempt.skillScores = skillScores;
    attempt.finalLevel = finalLevel;
    attempt.confidenceScore = confidenceScore;
    attempt.status = 'completed';
    attempt.completedAt = new Date();
    await this.attemptRepo.save(attempt);

    this.logger.log(
      `Attempt ${attempt.id} (set ${attempt.assignedSet}) completed: score=${totalScore} level=${finalLevel} confidence=${confidenceScore} ` +
      `(${scoredResponses.length} scored / ${allResponses.length} total answered / ${attempt.totalQuestions} in set)`,
    );

    return this.getResult(attempt.userId, attempt.id, true);
  }

  /**
   * Rule-based placement. Overall score maps to a base level; if any skill
   * lags meaningfully behind the average, the placement is capped one tier
   * down. Simple and auditable — a later phase can replace this with
   * IRT/Bayesian scoring once enough response data has accumulated.
   */
  private computePlacement(
    totalScore: number,
    skillScores: Record<string, number>,
    answeredCount: number,
    totalQuestions: number,
  ): { finalLevel: PlacementLevel; confidenceScore: number } {
    let baseLevel: PlacementLevel;
    if (totalScore <= 25) baseLevel = 'BEGINNER';
    else if (totalScore <= 50) baseLevel = 'ELEMENTARY';
    else if (totalScore <= 75) baseLevel = 'INTERMEDIATE';
    else baseLevel = 'ADVANCED';

    const scores = Object.values(skillScores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const weakestGap = avg - Math.min(...scores);

    const levels: PlacementLevel[] = ['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'ADVANCED'];
    let finalLevel = baseLevel;
    if (weakestGap > 20) {
      const idx = Math.max(0, levels.indexOf(baseLevel) - 1);
      finalLevel = levels[idx];
    }

    const variance = Math.max(...scores) - Math.min(...scores);
    const completionFactor = Math.min(answeredCount / totalQuestions, 1);
    const confidenceScore = Math.round(95 - variance * 0.3 - (1 - completionFactor) * 25);

    return { finalLevel, confidenceScore: Math.max(40, Math.min(95, confidenceScore)) };
  }

  // ── RESULT & REPORTS ────────────────────────────────────────────────
  async getResult(userId: string, attemptId: string, includeResponses = false): Promise<PlacementResult> {
    const attempt = await this.attemptRepo.findOne({ where: { id: attemptId, userId } });
    if (!attempt) throw new NotFoundException('Attempt not found.');
    if (attempt.status !== 'completed') {
      throw new ConflictException('Attempt is not completed yet.');
    }

    let responsesFormatted: any[] | undefined = undefined;
    if (includeResponses) {
      const responsesDb = await this.responseRepo.find({
        where: { attemptId: attempt.id },
        relations: ['question'],
        order: { questionOrder: 'ASC' },
      });

      responsesFormatted = responsesDb.map((r, idx) => ({
        questionNumber: idx + 1,
        questionId: r.questionId,
        skill: r.skill || r.question?.skill || 'grammar',
        questionText: r.question?.questionText || '',
        questionType: r.question?.questionType || 'mcq',
        options: r.question?.options || null,
        selectedOptionIndex: r.selectedOptionIndex,
        correctOptionIndex: r.question?.correctOptionIndex ?? null,
        textResponse: r.textResponse || null,
        correctAnswer: r.question?.correctAnswer || r.question?.modelAnswer || null,
        explanation: r.question?.explanation || null,
        isCorrect: r.isCorrect,
        isScored: r.isScored,
      }));
    }

    return {
      attemptId: attempt.id,
      totalScore: attempt.totalScore,
      skillScores: attempt.skillScores as Record<string, number>,
      finalLevel: attempt.finalLevel,
      confidenceScore: attempt.confidenceScore,
      completedAt: attempt.completedAt,
      ...(responsesFormatted ? { responses: responsesFormatted } : {}),
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
