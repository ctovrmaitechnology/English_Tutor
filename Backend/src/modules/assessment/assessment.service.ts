import { Injectable, Logger, BadRequestException, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { ModuleProgress } from './entities/module-progress.entity';
import { AssessmentQuestion } from './entities/assessment-question.entity';
import { AssessmentAttempt } from './entities/assessment-attempt.entity';
import { LessonQuestion } from './entities/lesson-question.entity';
import { Certificate } from './entities/certificate.entity';
import { GeminiService } from '../gemini/gemini.service';
import { User } from '../users/user.entity';
import { VoiceService } from '../voice/voice.service';

@Injectable()
export class AssessmentService implements OnModuleInit {
  private readonly logger = new Logger(AssessmentService.name);

  // Submodules that define Module 1
  private readonly MODULE_1_SUBMODULES = {
    speaking: ['sp-1-1', 'sp-1-2', 'sp-1-3', 'sp-1-4'],
    writing: ['wr-1-1', 'wr-1-2', 'wr-1-3', 'wr-1-4'],
  };

  async onModuleInit() {
    this.logger.log('Checking question bank on startup...');
    try {
      // Seed lesson questions first
      await this.seedLessonQuestions();

      const count = await this.questionRepository.count();
      if (count < 300) {
        this.logger.log('Question bank is incomplete. Quick-seeding fallbacks first...');
        const levels: ('BEGINNER' | 'INTERMEDIATE' | 'ADVANCED')[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
        const categories: ('speaking' | 'writing')[] = ['speaking', 'writing'];
        for (const level of levels) {
          for (const category of categories) {
            await this.seedFallbackQuestions(category, level);
          }
        }
        this.logger.log('Quick-seeding of fallbacks complete.');
      }
      this.seedQuestions().then(res => {
        this.logger.log(`Question bank status on startup: ${res.message}`);
      }).catch(err => {
        this.logger.error('Failed to auto-seed question bank:', err.message);
      });
    } catch (err: any) {
      this.logger.error('Failed to quick-seed on startup:', err.message);
    }
  }

  constructor(
    @InjectRepository(ModuleProgress)
    private readonly progressRepository: Repository<ModuleProgress>,
    @InjectRepository(AssessmentQuestion)
    private readonly questionRepository: Repository<AssessmentQuestion>,
    @InjectRepository(AssessmentAttempt)
    private readonly attemptRepository: Repository<AssessmentAttempt>,
    @InjectRepository(LessonQuestion)
    private readonly lessonQuestionRepository: Repository<LessonQuestion>,
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly geminiService: GeminiService,
    private readonly voiceService: VoiceService,
  ) {}

  // ── Progress Tracking ──────────────────────────────────────────
  async getProgress(userId: string): Promise<string[]> {
    const records = await this.progressRepository.find({
      where: { userId },
      select: ['subModuleId'],
    });
    return records.map(r => r.subModuleId);
  }

  async completeSubModule(
    userId: string,
    category: string,
    moduleId: string,
    subModuleId: string,
    completed = true,
  ): Promise<any> {
    if (!completed) {
      await this.progressRepository.delete({ userId, subModuleId });
      return { subModuleId, completed: false };
    }

    const existing = await this.progressRepository.findOne({
      where: { userId, subModuleId },
    });

    if (existing) {
      return existing;
    }

    const progress = this.progressRepository.create({
      userId,
      category,
      moduleId,
      subModuleId,
      completed: true,
    });

    return this.progressRepository.save(progress);
  }

  // ── Status & Gating Check ──────────────────────────────────────
  async getStatus(userId: string) {
    const completedSubs = await this.getProgress(userId);

    // Check Module 1 completion
    let isModule1SpeakingCompleted = this.MODULE_1_SUBMODULES.speaking.every(id =>
      completedSubs.includes(id),
    );
    let isModule1WritingCompleted = this.MODULE_1_SUBMODULES.writing.every(id =>
      completedSubs.includes(id),
    );

    // Auto-generate completion if any submodules of Module 1 are missing, preventing delay
    if (!isModule1SpeakingCompleted || !isModule1WritingCompleted) {
      this.logger.log(`Auto-generating Module 1 completions for user ${userId} to avoid delay.`);
      for (const id of this.MODULE_1_SUBMODULES.speaking) {
        if (!completedSubs.includes(id)) {
          await this.completeSubModule(userId, 'speaking', 'sp-1', id);
          completedSubs.push(id);
        }
      }
      for (const id of this.MODULE_1_SUBMODULES.writing) {
        if (!completedSubs.includes(id)) {
          await this.completeSubModule(userId, 'writing', 'wr-1', id);
          completedSubs.push(id);
        }
      }
      isModule1SpeakingCompleted = true;
      isModule1WritingCompleted = true;
    }

    // Fetch user's assessment attempts
    const attempts = await this.attemptRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Fetch stored certificates from DB
    const certificates = await this.certificateRepository.find({ where: { userId } });
    const speakingCert = certificates.find(c => c.category === 'speaking');
    const writingCert = certificates.find(c => c.category === 'writing');

    const passedSpeakingBeginner = attempts.some(a => a.category === 'speaking' && a.level === 'BEGINNER' && a.passed);
    const passedSpeakingIntermediate = attempts.some(a => a.category === 'speaking' && a.level === 'INTERMEDIATE' && a.passed);
    const passedSpeakingAdvanced = attempts.some(a => a.category === 'speaking' && a.level === 'ADVANCED' && a.passed);

    const passedWritingBeginner = attempts.some(a => a.category === 'writing' && a.level === 'BEGINNER' && a.passed);
    const passedWritingIntermediate = attempts.some(a => a.category === 'writing' && a.level === 'INTERMEDIATE' && a.passed);
    const passedWritingAdvanced = attempts.some(a => a.category === 'writing' && a.level === 'ADVANCED' && a.passed);

    const isSpeakingCertified = passedSpeakingBeginner && passedSpeakingIntermediate && passedSpeakingAdvanced;
    const isWritingCertified = passedWritingBeginner && passedWritingIntermediate && passedWritingAdvanced;

    const isModule2SpeakingCompleted = ['sp-2-1', 'sp-2-2', 'sp-2-3', 'sp-2-4'].every(id => completedSubs.includes(id));
    const isModule2WritingCompleted = ['wr-2-1', 'wr-2-2', 'wr-2-3', 'wr-2-4'].every(id => completedSubs.includes(id));
    const isModule3SpeakingCompleted = ['sp-3-1', 'sp-3-2', 'sp-3-3', 'sp-3-4'].every(id => completedSubs.includes(id));
    const isModule3WritingCompleted = ['wr-3-1', 'wr-3-2', 'wr-3-3', 'wr-3-4'].every(id => completedSubs.includes(id));
    const isModule4SpeakingCompleted = ['sp-4-1', 'sp-4-2', 'sp-4-3', 'sp-4-4'].every(id => completedSubs.includes(id));
    const isModule4WritingCompleted = ['wr-4-1', 'wr-4-2', 'wr-4-3', 'wr-4-4'].every(id => completedSubs.includes(id));

    // Module 2 unlocking per category (remains unlocked if they have a certificate stored)
    const isSpeakingModule2Unlocked = isModule1SpeakingCompleted && (passedSpeakingBeginner || !!speakingCert);
    const isWritingModule2Unlocked = isModule1WritingCompleted && (passedWritingBeginner || !!writingCert);

    // Fetch user details for the certificate
    const user = await this.userRepository.findOne({ where: { id: userId } });

    // FIX: Use fixed denominator of 5 (test always has 5 questions).
    // Using answers.length caused wrong % when questions were missing from DB
    // (background seeding race) — answers.length could be 3 → score/3 inflated to 100%.
    const FIXED_TOTAL = 5;

    const getBestScorePercentage = (category: 'speaking' | 'writing', level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => {
      const levelAttempts = attempts.filter(a => a.category === category && a.level === level);
      if (levelAttempts.length === 0) return null;
      const percentages = levelAttempts.map(a => {
        const total = FIXED_TOTAL;
        return (a.score / total) * 100;
      });
      return Math.round(Math.max(...percentages));
    };

    const getAttemptPercentage = (level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED', category: 'speaking' | 'writing') => {
      const passAttempt = attempts.find(a => a.category === category && a.level === level && a.passed);
      if (!passAttempt) return 0;
      const total = FIXED_TOTAL;
      return Math.round((passAttempt.score / total) * 100);
    };

    let speakingPassingScore = 0;
    if (isSpeakingCertified) {
      const pctB = getAttemptPercentage('BEGINNER', 'speaking');
      const pctI = getAttemptPercentage('INTERMEDIATE', 'speaking');
      const pctA = getAttemptPercentage('ADVANCED', 'speaking');
      speakingPassingScore = Math.round((pctB + pctI + pctA) / 3);
    } else if (speakingCert) {
      speakingPassingScore = speakingCert.score;
    }

    let writingPassingScore = 0;
    if (isWritingCertified) {
      const pctB = getAttemptPercentage('BEGINNER', 'writing');
      const pctI = getAttemptPercentage('INTERMEDIATE', 'writing');
      const pctA = getAttemptPercentage('ADVANCED', 'writing');
      writingPassingScore = Math.round((pctB + pctI + pctA) / 3);
    } else if (writingCert) {
      writingPassingScore = writingCert.score;
    }

    const passedLevels = [
      passedSpeakingBeginner, passedSpeakingIntermediate, passedSpeakingAdvanced,
      passedWritingBeginner, passedWritingIntermediate, passedWritingAdvanced
    ].filter(Boolean).length;
    const overallProgress = Math.round((passedLevels / 6) * 100);

    return {
      isModule1SpeakingCompleted,
      isModule1WritingCompleted,
      isModule2SpeakingCompleted,
      isModule2WritingCompleted,
      isModule3SpeakingCompleted,
      isModule3WritingCompleted,
      isModule4SpeakingCompleted,
      isModule4WritingCompleted,
      isModule1Completed: true,

      // Flat keys for backwards compatibility / global modules unlock
      passedBeginner: passedSpeakingBeginner && passedWritingBeginner,
      passedIntermediate: passedSpeakingIntermediate && passedWritingIntermediate,
      passedAdvanced: passedSpeakingAdvanced && passedWritingAdvanced,
      isModule2Unlocked: isSpeakingModule2Unlocked && isWritingModule2Unlocked,
      isCertified: (isSpeakingCertified || !!speakingCert) && (isWritingCertified || !!writingCert),

      // Track-specific flags
      isSpeakingModule2Unlocked,
      isWritingModule2Unlocked,
      isSpeakingCertified,
      isWritingCertified,

      speakingCertificate: speakingCert ? {
        id: speakingCert.id,
        score: speakingCert.score,
        createdAt: speakingCert.createdAt,
        recipientName: speakingCert.recipientName,
        moduleName: speakingCert.moduleName,
      } : null,
      writingCertificate: writingCert ? {
        id: writingCert.id,
        score: writingCert.score,
        createdAt: writingCert.createdAt,
        recipientName: writingCert.recipientName,
        moduleName: writingCert.moduleName,
      } : null,

      recipientName: user ? `${user.first_name} ${user.last_name}` : 'Employee Participant',
      overallProgress,

      speaking: {
        passedBeginner: passedSpeakingBeginner,
        passedIntermediate: passedSpeakingIntermediate,
        passedAdvanced: passedSpeakingAdvanced,
        scores: {
          beginner: getBestScorePercentage('speaking', 'BEGINNER'),
          intermediate: getBestScorePercentage('speaking', 'INTERMEDIATE'),
          advanced: getBestScorePercentage('speaking', 'ADVANCED'),
        },
        passingScore: speakingPassingScore || null
      },
      writing: {
        passedBeginner: passedWritingBeginner,
        passedIntermediate: passedWritingIntermediate,
        passedAdvanced: passedWritingAdvanced,
        scores: {
          beginner: getBestScorePercentage('writing', 'BEGINNER'),
          intermediate: getBestScorePercentage('writing', 'INTERMEDIATE'),
          advanced: getBestScorePercentage('writing', 'ADVANCED'),
        },
        passingScore: writingPassingScore || null
      },
      scores: {
        beginner: getBestScorePercentage('speaking', 'BEGINNER'),
        intermediate: getBestScorePercentage('speaking', 'INTERMEDIATE'),
        advanced: getBestScorePercentage('speaking', 'ADVANCED'),
        overallPassingScore: Math.round((speakingPassingScore + writingPassingScore) / 2) || null
      }
    };
  }

  // ── Question Selection (Probability/No-Repeat Logic) ───────────
  private classifyQuestion(
    q: AssessmentQuestion,
    category: 'speaking' | 'writing',
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  ): number {
    const text = q.questionText.toLowerCase();
    const expl = (q.explanation || '').toLowerCase();

    if (category === 'speaking') {
      if (level === 'BEGINNER') {
        if (text.includes("blue coat") || text.includes("vowel") || text.includes("lives in a big house")) return 0;
        if (text.includes("seashells") || text.includes("consonant") || text.includes("quick brown fox")) return 1;
        if (text.includes("record the details") || text.includes("stress") || text.includes("focus on the customer's")) return 2;
        if (text.includes("joining us today") || text.includes("intonation") || text.includes("billing info") || text.includes("repeat that last digit") || text.includes("good morning! welcome")) return 3;
        if (expl.includes("vowel") || expl.includes("/u:/") || expl.includes("/o:/") || expl.includes("/ɪ/") || expl.includes("/i:/")) return 0;
        if (expl.includes("consonant") || expl.includes("/s/") || expl.includes("/ʃ/") || expl.includes("articulate")) return 1;
        if (expl.includes("stress") || expl.includes("emphasize")) return 2;
        if (expl.includes("intonation") || expl.includes("pitch") || expl.includes("rising") || expl.includes("falling")) return 3;
        return 0;
      } else if (level === 'INTERMEDIATE') {
        if (text.includes("calling ruralshores") || text.includes("opening") || text.includes("greeting") || text.includes("welcome to")) return 0;
        if (text.includes("invoice yet") || text.includes("hear your concern") || text.includes("active listening") || text.includes("understand that you")) return 1;
        if (text.includes("service fee") || text.includes("objection") || text.includes("charges") || text.includes("price") || text.includes("expensive")) return 2;
        if (text.includes("hold for two") || text.includes("thank you for holding") || text.includes("wait") || text.includes("double check")) return 3;
        if (text.includes("pleasure assisting") || text.includes("closing") || text.includes("email address") || text.includes("anything else")) return 4;
        if (expl.includes("greeting") || expl.includes("opening") || expl.includes("welcome")) return 0;
        if (expl.includes("empathize") || expl.includes("listening") || expl.includes("understand")) return 1;
        if (expl.includes("fee") || expl.includes("charge") || expl.includes("objection") || expl.includes("reassuring")) return 2;
        if (expl.includes("hold") || expl.includes("wait") || expl.includes("timeline")) return 3;
        if (expl.includes("closing") || expl.includes("close") || expl.includes("closing line")) return 4;
        return 0;
      } else if (level === 'ADVANCED') {
        if (text.includes("value your loyalty") || text.includes("remain on the line") || text.includes("persuasive") || text.includes("loyalty")) return 0;
        if (text.includes("cash refund") || text.includes("mutual solution") || text.includes("negotiate") || text.includes("refund")) return 1;
        if (text.includes("escalate this directly") || text.includes("initial fix") || text.includes("fresh perspective") || text.includes("engineering squad")) return 2;
        if (text.includes("routed twice") || text.includes("critical this connection") || text.includes("inconvenience this outage") || text.includes("empathy")) return 3;
        if (text.includes("prevent this from recurring") || text.includes("permissions") || text.includes("compliance") || text.includes("boundary")) return 4;
        if (expl.includes("loyalty") || expl.includes("persuasion") || expl.includes("committed") || expl.includes("undivided attention")) return 0;
        if (expl.includes("negotiation") || expl.includes("alternative") || expl.includes("credit") || expl.includes("refund")) return 1;
        if (expl.includes("escalate") || expl.includes("timelines") || expl.includes("lapse grace") || expl.includes("troubleshooting")) return 2;
        if (expl.includes("routed") || expl.includes("empathy") || expl.includes("inconvenience") || expl.includes("frustration")) return 3;
        if (expl.includes("prevent") || expl.includes("security") || expl.includes("compliance") || expl.includes("verification")) return 4;
        return 0;
      }
    } else {
      if (level === 'BEGINNER') {
        if (text.includes("subject-verb") || text.includes("agreement") || text.includes("singular") || text.includes("plural")) return 3;
        if (text.includes("greeting") || text.includes("closing") || text.includes("salutation")) return 3;
        if (text.includes("pronoun") || text.includes("possessive")) return 3;
        if (text.includes("spelling") || text.includes("spell")) return 3;
        if (text.includes("punctuation") || text.includes("comma") || text.includes("period") || text.includes("question mark")) return 2;
        if (text.includes("capitalization") || text.includes("capitalize")) return 2;
        if (text.includes("will") || text.includes("would") || text.includes("shall") || text.includes("tense") || text.includes("yesterday")) return 0;
        return 1;
      } else if (level === 'INTERMEDIATE') {
        if (text.includes("subject line") || text.includes("title")) return 0;
        if (text.includes("greeting") || text.includes("salutation") || text.includes("email greeting")) return 1;
        if (text.includes("preposition") || text.includes("prepositions") || text.includes("prepositional") || text.includes("body")) return 2;
        if (text.includes("closing line") || text.includes("closing") || text.includes("sign-off")) return 3;
        return 2;
      } else if (level === 'ADVANCED') {
        if (text.includes("escalation") || text.includes("escalating")) return 0;
        if (text.includes("negotiation") || text.includes("negotiating") || text.includes("refund")) return 0;
        if (text.includes("syntax") || text.includes("conditional") || text.includes("grammar")) return 1;
        if (text.includes("fcr") || text.includes("first contact") || text.includes("metric")) return 2;
        if (text.includes("attrition") || text.includes("business review") || text.includes("internal")) return 3;
        return 1;
      }
    }
    return 0;
  }

  // ── Question Selection (Probability/No-Repeat Logic) ───────────
  async getQuestionsForUser(
    userId: string,
    category: 'speaking' | 'writing',
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  ): Promise<any[]> {
    // 1. Get all questions for this category and level
    let allQuestions = await this.questionRepository.find({
      where: { category, level },
    });

    // Self-seed on-the-fly if incomplete/empty to prevent errors
    if (allQuestions.length < 5) {
      this.logger.log(`Insufficient questions for ${category} ${level} (${allQuestions.length}). Seeding fallbacks...`);
      await this.seedFallbackQuestions(category, level);
      allQuestions = await this.questionRepository.find({
        where: { category, level },
      });
    }

    // 2. Find IDs of questions this user has seen in previous attempts
    const userAttempts = await this.attemptRepository.find({
      where: { userId, category, level },
      select: ['answers'],
    });

    const seenIds = new Set<string>();
    for (const attempt of userAttempts) {
      const answers = attempt.answers as any[];
      if (Array.isArray(answers)) {
        for (const ans of answers) {
          if (ans?.questionId) {
            seenIds.add(ans.questionId);
          }
        }
      }
    }

    // 3. Group questions by submodule slot (0 to 4)
    const getQuestionsBySlot = (questionsList: AssessmentQuestion[]) => {
      const slots: AssessmentQuestion[][] = [[], [], [], [], []];
      for (const q of questionsList) {
        const slot = this.classifyQuestion(q, category, level);
        if (slot >= 0 && slot < 5) {
          slots[slot].push(q);
        } else {
          slots[0].push(q);
        }
      }
      return slots;
    };

    const unseenSlots = getQuestionsBySlot(allQuestions.filter(q => !seenIds.has(q.id)));
    const seenSlots = getQuestionsBySlot(allQuestions.filter(q => seenIds.has(q.id)));

    const selected: AssessmentQuestion[] = [];

    // For each of the 5 slots, select 1 question in order
    for (let i = 0; i < 5; i++) {
      let chosen: AssessmentQuestion | undefined;

      // 1. Try to get an unseen question from slot i
      if (unseenSlots[i] && unseenSlots[i].length > 0) {
        const pool = unseenSlots[i];
        chosen = pool[Math.floor(Math.random() * pool.length)];
      } 
      // 2. If no unseen in slot i, try seen in slot i
      else if (seenSlots[i] && seenSlots[i].length > 0) {
        const pool = seenSlots[i];
        chosen = pool[Math.floor(Math.random() * pool.length)];
      }
      // 3. Fallback: if slot i is completely empty, try any unseen from other slots
      else {
        const flatUnseen = unseenSlots.flat().filter(q => !selected.includes(q));
        if (flatUnseen.length > 0) {
          chosen = flatUnseen[Math.floor(Math.random() * flatUnseen.length)];
        } else {
          const flatSeen = seenSlots.flat().filter(q => !selected.includes(q));
          if (flatSeen.length > 0) {
            chosen = flatSeen[Math.floor(Math.random() * flatSeen.length)];
          }
        }
      }

      if (chosen) {
        selected.push(chosen);
      }
    }

    // In the rare event that selected has fewer than 5 questions, pad it
    while (selected.length < 5 && allQuestions.length > 0) {
      const remaining = allQuestions.filter(q => !selected.includes(q));
      if (remaining.length === 0) break;
      selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
    }

    // Return without correctOptionIndex to prevent cheating
    return selected.map(q => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      explanation: category === 'speaking' ? q.explanation : undefined,
    }));
  }

  // ── Submit & Grade Assessment ──────────────────────────────────
  async submitAnswers(
    userId: string,
    category: 'speaking' | 'writing',
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    submittedAnswers: Record<string, number>,
    feedbacks?: Record<string, string>,
    transcripts?: Record<string, string>,
  ) {
    const questionIds = Object.keys(submittedAnswers);
    if (questionIds.length === 0) {
      throw new BadRequestException('No answers submitted');
    }

    // FIX: Always use the number of submitted question IDs as the denominator,
    // never questions.length — DB may return fewer rows if IDs are stale/missing.
    const TOTAL_QUESTIONS = questionIds.length;

    // Load actual questions
    const questions = await this.questionRepository.find({
      where: { id: In(questionIds), category, level },
    });

    // Index found questions by id for O(1) lookup
    const questionMap = new Map(questions.map(q => [q.id, q]));

    let score = 0;
    const answerHistory = [];

    // FIX: Iterate submitted IDs, not just found questions.
    // Any ID not found in DB is marked incorrect — prevents inflated scores
    // when background seeding replaces question rows with new UUIDs.
    for (const qid of questionIds) {
      const q = questionMap.get(qid);
      const userChoice = submittedAnswers[qid];

      if (!q) {
        // Question not found — count as incorrect, preserve audit trail
        answerHistory.push({
          questionId: qid,
          questionText: null,
          options: [],
          selectedOption: userChoice,
          correctOption: null,
          isCorrect: false,
          explanation: null,
        });
        continue;
      }

      const isCorrect = category === 'speaking'
        ? userChoice >= (q.correctOptionIndex ?? 70)
        : userChoice === q.correctOptionIndex;
      if (isCorrect) score++;

      answerHistory.push({
        questionId: q.id,
        questionText: q.questionText,
        options: q.options,
        selectedOption: userChoice,
        correctOption: q.correctOptionIndex,
        isCorrect,
        explanation: feedbacks?.[q.id] || q.explanation,
        transcript: transcripts?.[q.id] || undefined,
      });
    }

    // FIX: Always divide by TOTAL_QUESTIONS (= questionIds.length = 5),
    // never by questions.length which varies when DB rows are missing.
    const percentage = (score / TOTAL_QUESTIONS) * 100;

    let passed = false;
    let requiredPercentage = 85;
    if (level === 'BEGINNER') {
      passed = percentage >= 85;
      requiredPercentage = 85;
    } else if (level === 'INTERMEDIATE') {
      passed = percentage >= 80;
      requiredPercentage = 80;
    } else if (level === 'ADVANCED') {
      passed = percentage >= 75;
      requiredPercentage = 75;
    }

    const attempt = this.attemptRepository.create({
      userId,
      category,
      level,
      score,
      passed,
      answers: answerHistory.map(a => ({
        questionId: a.questionId,
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
        feedback: a.explanation,
        transcript: a.transcript,
      })),
    });

    await this.attemptRepository.save(attempt);

    // If user passes ADVANCED level, check if they have passed all 3 levels, and generate/store certificate
    if (level === 'ADVANCED' && passed) {
      try {
        const attemptsList = await this.attemptRepository.find({
          where: { userId, category, passed: true },
        });
        const hasB = attemptsList.some(a => a.level === 'BEGINNER');
        const hasI = attemptsList.some(a => a.level === 'INTERMEDIATE');
        if (hasB && hasI) {
          const getPassingPct = (lvl: 'BEGINNER' | 'INTERMEDIATE') => {
            const passAtt = attemptsList.find(a => a.level === lvl);
            if (!passAtt) return 80;
            const total = 5;
            return Math.round((passAtt.score / total) * 100);
          };

          const pctB = getPassingPct('BEGINNER');
          const pctI = getPassingPct('INTERMEDIATE');
          const pctA = Math.round(percentage);
          const overallScore = Math.round((pctB + pctI + pctA) / 3);

          const user = await this.userRepository.findOne({ where: { id: userId } });
          const recipientName = user ? `${user.first_name} ${user.last_name}` : 'Employee Participant';
          const moduleName = category === 'speaking' ? 'Module 1 Speaking' : 'Module 1 Writing';

          let cert = await this.certificateRepository.findOne({
            where: { userId, category }
          });

          if (!cert) {
            cert = this.certificateRepository.create({
              userId,
              category,
              moduleName,
              score: overallScore,
              recipientName,
            });
          } else {
            cert.score = overallScore;
            cert.recipientName = recipientName;
            cert.createdAt = new Date();
          }

          await this.certificateRepository.save(cert);
          this.logger.log(`Generated and stored certificate for user ${userId}, category ${category}, score ${overallScore}%`);
        }
      } catch (err: any) {
        this.logger.error(`Failed to generate certificate: ${err.message}`);
      }
    }

    // FIX: Return the updated status inline so the frontend never needs to
    // re-fetch getStatus() immediately after submit. A re-fetch racing the
    // DB commit sees stale data (previous attempt) and shows the wrong score
    // until the user reloads. Returning status here eliminates that race.
    const updatedStatus = await this.getStatus(userId);

    return {
      attemptId: attempt.id,
      score,
      totalQuestions: TOTAL_QUESTIONS,
      percentage: Math.round(percentage),
      passed,
      requiredPercentage,
      details: answerHistory,
      // Frontend: use this directly — do NOT call GET /assessment/status after submit
      status: updatedStatus,
    };
  }

  async retakeAssessment(userId: string, category: 'speaking' | 'writing') {
    // Delete all attempts for this user and category to allow them to take Beginner, Intermediate, and Advanced again
    await this.attemptRepository.delete({ userId, category });
    this.logger.log(`Assessment attempts reset for user ${userId}, category ${category}`);
    return {
      success: true,
      message: `Assessment attempts for ${category} have been reset. You can now retake the assessment starting from Beginner level.`,
    };
  }

  async resetModuleProgress(userId: string, moduleId: string) {
    // Delete all submodule completion progress records for this user and module ID
    await this.progressRepository.delete({ userId, moduleId });
    this.logger.log(`Module progress reset for user ${userId}, module ${moduleId}`);
    return {
      success: true,
      message: `Progress for module ${moduleId} has been reset successfully.`,
    };
  }

  private async evaluateScenarioResponse(scenario: string, transcript: string): Promise<{ score: number; feedback: string }> {
    const prompt = `
You are an expert corporate communications trainer evaluating a candidate's spoken response to a BPO customer service scenario.

Scenario: "${scenario}"
Candidate Spoken Response: "${transcript}"

Task:
Evaluate the response based on:
1. Professionalism & politeness
2. Grammatical correctness
3. Relevance and problem-solving appropriateness for the scenario
4. Empathy and tone

Return a JSON object with the following fields:
1. "score": An integer between 0 and 100 representing their evaluation grade.
2. "feedback": A short (1-2 sentences) constructive feedback paragraph explaining what they did well and how they can improve.

Return ONLY the raw JSON object. Do not include markdown formatting or extra text.
`;
    try {
      const result = await this.geminiService.generateJSON<{ score: number; feedback: string }>(
        prompt,
        "You are a BPO English training grader returning a JSON format score and feedback.",
      );
      return {
        score: Math.min(100, Math.max(0, result.score || 0)),
        feedback: result.feedback || "Good effort. Keep practicing to speak clearly.",
      };
    } catch (err: any) {
      this.logger.error(`Gemini evaluation of scenario failed: ${err.message}`);
      return {
        score: 65, // fallback
        feedback: "Could not perform detailed AI analysis. Try to speak clearly and resolve the customer concern.",
      };
    }
  }

  async transcribeSpeakingPassage(
    questionId: string,
    audioBuffer: Buffer,
    filename = 'audio.wav',
  ): Promise<{
    questionId: string;
    passage: string;
    transcript: string;
    similarityScore: number;
    passed: boolean;
    feedback: string;
  }> {
    // 1. Load the expected passage from DB
    const question = await this.questionRepository.findOne({
      where: { id: questionId, category: 'speaking' },
    });

    if (!question) {
      throw new NotFoundException(`Speaking question "${questionId}" not found`);
    }

    // 2. Send audio to Whisper STT service
    let transcript: string;
    try {
      transcript = await this.voiceService.transcribe(audioBuffer, filename);
    } catch (err: any) {
      throw new BadRequestException(
        `Speech-to-text failed: ${err?.message}. Is the STT service running?`,
      );
    }

    let similarityScore: number;
    let feedback: string;
    let passed: boolean;

    if (question.level === 'INTERMEDIATE') {
      // Scenario-based evaluation using Gemini
      const evalResult = await this.evaluateScenarioResponse(question.questionText, transcript);
      similarityScore = evalResult.score;
      feedback = evalResult.feedback;
      passed = similarityScore >= 70; // 70% passing threshold for intermediate scenario
    } else {
      // Normal read-aloud text-similarity evaluation
      similarityScore = computeTextSimilarity(question.questionText, transcript);
      passed = similarityScore >= (question.correctOptionIndex ?? 70);
      feedback = generateSpeakingFeedback(
        similarityScore,
        question.explanation ?? '',
        question.questionText,
        transcript,
      );
    }

    this.logger.log(
      `Speaking STT: questionId=${questionId} score=${similarityScore}% passed=${passed} level=${question.level}`,
    );

    return {
      questionId,
      passage: question.questionText,
      transcript: transcript.trim(),
      similarityScore,
      passed,
      feedback,
    };
  }

  // ── Gemini Seeding Engine ──────────────────────────────────────
  async seedQuestions(force = false): Promise<{ count: number; seeded: boolean; message: string }> {
    const existingCount = await this.questionRepository.count();

    // Check if seeding is already done and we're not forcing
    if (existingCount >= 300 && !force) {
      return {
        count: existingCount,
        seeded: false,
        message: 'Question bank already contains 300+ questions.',
      };
    }

    this.logger.log(`Starting question bank seeding... (Current count: ${existingCount})`);

    const levels: ('BEGINNER' | 'INTERMEDIATE' | 'ADVANCED')[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    const categories: ('speaking' | 'writing')[] = ['speaking', 'writing'];
    let totalGenerated = 0;

    for (const level of levels) {
      for (const category of categories) {
        const count = await this.questionRepository.count({ where: { level, category } });
        const needed = Math.max(50 - count, 0);

        if (needed === 0) {
          this.logger.log(`Level ${level} Category ${category} already has 50+ questions.`);
          continue;
        }

        this.logger.log(`Generating ${needed} questions for level ${level} category ${category} using Gemini...`);

        const batchSize = 10;
        const batches = Math.ceil(needed / batchSize);

        for (let i = 0; i < batches; i++) {
          const currentBatchSize = Math.min(batchSize, needed - i * batchSize);
          this.logger.log(`Level ${level} Category ${category}: Generating batch ${i + 1}/${batches} (size: ${currentBatchSize})...`);

          try {
            const generatedQuestions = await this.generateQuestionsFromGemini(category, level, currentBatchSize);
            
            if (Array.isArray(generatedQuestions) && generatedQuestions.length > 0) {
              const entities = generatedQuestions.map(q =>
                this.questionRepository.create({
                  level,
                  category,
                  questionText: q.questionText,
                  options: q.options,
                  correctOptionIndex: q.correctOptionIndex,
                  explanation: q.explanation || 'Excellent explanation.',
                }),
              );
              await this.questionRepository.save(entities);
              totalGenerated += entities.length;
              this.logger.log(`Successfully saved ${entities.length} questions for ${level} ${category} from Gemini.`);
            }
          } catch (err: any) {
            this.logger.error(`Failed to generate batch ${i + 1} for ${level} ${category} from Gemini: ${err.message}`);
            this.logger.log(`Loading fallback pre-baked questions for ${level} ${category}...`);
            const fallbackCount = await this.seedFallbackQuestions(category, level);
            totalGenerated += fallbackCount;
            break;
          }
        }
      }
    }

    const finalCount = await this.questionRepository.count();
    return {
      count: finalCount,
      seeded: totalGenerated > 0,
      message: `Seeding complete. Added ${totalGenerated} questions. Total questions in database: ${finalCount}`,
    };
  }

  private async generateQuestionsFromGemini(
    category: 'speaking' | 'writing',
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    count: number,
  ): Promise<any[]> {
    const focusAreas = {
      speaking: {
        BEGINNER: 'pronunciation of vowels and consonants, simple sentence intonation, word stress, basic greetings.',
        INTERMEDIATE: 'verbal active listening, professional BPO call handling, vocal objection handling, call closing greetings.',
        ADVANCED: 'oral negotiation, persuasive speaking, complex customer support de-escalation, high-empathy scenarios.',
      },
      writing: {
        BEGINNER: 'written grammar (pronouns, subject-verb agreement), elementary writing mechanics, spelling, punctuation, standard email greeting formats.',
        INTERMEDIATE: 'written BPO correspondence, customer email drafting, written active listening responses, structure of written ticket notes.',
        ADVANCED: 'written escalation replies, formal customer correspondence, complex sentence syntax correction, written grammar, business email strategies.',
      }
    };

    const systemPrompt = category === 'speaking'
      ? `You are a curriculum developer for a BPO English training company. Generate a JSON list of English speaking read-aloud assessment tasks.`
      : `You are a curriculum developer for a BPO English training company. Generate a JSON list of English writing multiple-choice questions.`;

    const prompt = category === 'speaking'
      ? `Generate exactly ${count} unique English read-aloud tasks for the ${level} level focused on ${category} skills.
Focus areas: ${focusAreas[category][level]}

Each task must consist of a short paragraph or sentence (10 to 25 words) that the student must read aloud clearly to demonstrate pronunciation, word stress, and natural rhythm.
The options array must be an empty array [].
The correctOptionIndex must be 70 (representing the minimum passing score threshold of 70%).
The explanation must be a short pronunciation tip or trick to read this specific text aloud.

You must return ONLY a raw JSON array of objects with the exact shape:
[
  {
    "questionText": "Sentence/paragraph to read aloud...",
    "options": [],
    "correctOptionIndex": 70,
    "explanation": "Pronunciation tip for this specific sentence."
  }
]
Do not return any markdown wraps, explanation paragraphs, or characters outside of the JSON array.`
      : `Generate exactly ${count} unique multiple-choice questions for the ${level} level focused on writing skills.
Focus areas: ${focusAreas[category][level]}

Each question must be a multiple-choice question with exactly 4 options.
The correctOptionIndex must be an integer between 0 and 3 corresponding to the correct answer in the options array.

You must return ONLY a raw JSON array of objects with the exact shape:
[
  {
    "questionText": "Question text...",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctOptionIndex": 0,
    "explanation": "Short sentence explaining why this option is correct."
  }
]
Do not return any markdown wraps, explanation paragraphs, or characters outside of the JSON array.`;

    return this.geminiService.generateJSON<any[]>(prompt, systemPrompt);
  }

  // ── Seeding Fallbacks (In Case Gemini Key/Quota Fails) ─────────
  private async seedFallbackQuestions(
    category: 'speaking' | 'writing',
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  ): Promise<number> {
    const fallbacks = this.getFallbackQuestions(category, level);
    let seededCount = 0;

    for (const q of fallbacks) {
      // Check if duplicate question exists
      const existing = await this.questionRepository.findOne({
        where: { questionText: q.questionText, category, level },
      });

      if (!existing) {
        const entity = this.questionRepository.create({
          category,
          level,
          questionText: q.questionText,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
        });
        await this.questionRepository.save(entity);
        seededCount++;
      }
    }

    // Replicate fallbacks to fill up the required pool if still lacking, changing vocabulary
    const currentCount = await this.questionRepository.count({ where: { category, level } });
    if (currentCount < 50) {
      const deficit = 50 - currentCount;
      const replicated = [];
      for (let i = 0; i < deficit; i++) {
        const template = fallbacks[i % fallbacks.length];
        replicated.push(
          this.questionRepository.create({
            category,
            level,
            questionText: `${template.questionText} (v${Math.floor(i / fallbacks.length) + 2})`,
            options: [...template.options],
            correctOptionIndex: template.correctOptionIndex,
            explanation: template.explanation,
          }),
        );
      }
      await this.questionRepository.save(replicated);
      seededCount += replicated.length;
    }

    return seededCount;
  }

  private getFallbackQuestions(
    category: 'speaking' | 'writing',
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  ): any[] {
    const list = {
      speaking: {
        BEGINNER: [
          {
            questionText: "The blue coat is too warm for the hot room.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Focus on clear /u:/ and /o:/ vowel sounds."
          },
          {
            questionText: "She sells seashells by the seashore.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Differentiate between the /s/ and /ʃ/ consonant sounds."
          },
          {
            questionText: "You must record the details in the database before you play back the recording.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Stress 'RE-cord' for the noun and 're-CORD' for the verb."
          },
          {
            questionText: "Are you joining us today, or are you staying here?",
            options: [],
            correctOptionIndex: 70,
            explanation: "Use rising intonation at the end of the question."
          },
          {
            questionText: "Where is the customer billing info listed on your screen?",
            options: [],
            correctOptionIndex: 70,
            explanation: "Use falling intonation at the end of this WH-question."
          },
          {
            questionText: "Good morning! Welcome to customer support. My name is Sarah.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Maintain a warm, friendly tone and steady pace."
          },
          {
            questionText: "The quick brown fox jumps over the lazy dog.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Articulate all consonants clearly, especially 'v', 'z', and 'th'."
          },
          {
            questionText: "Could you repeat that last digit of your phone number?",
            options: [],
            correctOptionIndex: 70,
            explanation: "Use rising intonation for polite verification questions."
          },
          {
            questionText: "He lives in a big house near the center of the city.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Focus on the short /ɪ/ and long /i:/ sounds."
          },
          {
            questionText: "Let's focus on the customer's main concern first.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Emphasize the primary noun 'customer' and verb 'focus'."
          }
        ],
        INTERMEDIATE: [
          {
            questionText: "Thank you for calling RuralShores Customer Support. My name is Alex. How may I help you today?",
            options: [],
            correctOptionIndex: 70,
            explanation: "Sound professional, energetic, and articulate during the greeting."
          },
          {
            questionText: "I understand that you have not received your invoice yet. Let me check that in our billing system.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Empathize with the customer's concern and state your immediate action clearly."
          },
          {
            questionText: "I completely agree that the service fee is higher than expected. However, this includes our 24/7 technical support.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Use a polite, reassuring tone when explaining fees and value."
          },
          {
            questionText: "It was a pleasure assisting you today. Thank you for choosing RuralShores. Have a wonderful day ahead!",
            options: [],
            correctOptionIndex: 70,
            explanation: "Ensure your tone remains warm and polite until the call is completed."
          },
          {
            questionText: "Could you please hold for two minutes while I discuss this with our supervisor?",
            options: [],
            correctOptionIndex: 70,
            explanation: "Ask permission politely and set a clear timeframe before placing on hold."
          },
          {
            questionText: "I hear your concern. Rest assured, I will personally monitor this ticket until it is resolved.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Express firm verbal commitment and use stress on 'personally'."
          },
          {
            questionText: "Let me double check the account status to see if the refund has been processed yet.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Speak at a moderate pace to avoid confusion with transaction terms."
          },
          {
            questionText: "Thank you for holding. I have updated your billing address in our database.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Thank the caller first, then state the completed action."
          },
          {
            questionText: "If you could provide your email address, I will send you the confirmation receipt immediately.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Speak clearly and outline the immediate benefit to the customer."
          },
          {
            questionText: "I apologize for the wait. Our servers are responding a bit slowly today, but we are on it.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Maintain a calm, explanatory tone without sounding defensive."
          }
        ],
        ADVANCED: [
          {
            questionText: "I realize you have been routed twice already. I am personally taking charge of your account to resolve this.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Validate their frustration and express strong personal ownership of the problem."
          },
          {
            questionText: "While we cannot process a full cash refund at this stage, I can credit your account with two months of free service.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Offer alternative resolutions with a collaborative and firm, yet polite tone."
          },
          {
            questionText: "I apologize sincerely for the inconvenience this outage has caused to your business. Let me walk you through our backup options.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Show deep empathy and guide the client toward practical solutions."
          },
          {
            questionText: "We value your loyalty over the past five years, and we are committed to making this right for you today.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Emphasize loyalty and value with warm, sincere vocal stress."
          },
          {
            questionText: "I will escalate this directly to our senior engineering squad and phone you back with an update in two hours.",
            options: [],
            correctOptionIndex: 70,
            explanation: "State a clear action plan with precise timelines to restore trust."
          },
          {
            questionText: "Let's find a mutual solution that protects your data while staying within our compliance guidelines.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Use collaborative phrasing and professional corporate tone."
          },
          {
            questionText: "I hear how critical this connection is for your team, and I am prioritizing your case accordingly.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Align your tone with the urgency of the customer's situation."
          },
          {
            questionText: "I apologize that our initial fix did not resolve the issue. Let's look at this from a fresh perspective.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Admit the lapse gracefully and pivot to secondary troubleshooting."
          },
          {
            questionText: "I will remain on the line with you while we perform the software migration to ensure it goes smoothly.",
            options: [],
            correctOptionIndex: 70,
            explanation: "Reassure the client of your undivided attention during critical events."
          },
          {
            questionText: "To prevent this from recurring, we are updating our account permissions. Thank you for bringing this to our attention.",
            options: [],
            correctOptionIndex: 70,
            explanation: "State preventive measures to reassure the client of long-term stability."
          }
        ]
      },
      writing: {
        BEGINNER: [
          {
            questionText: "Identify the sentence with correct written subject-verb agreement:",
            options: [
              "The customer service agent handle calls quickly.",
              "The customer service agent handles calls quickly.",
              "The customer service agent are handling calls quickly.",
              "The customer service agent handle call quickly."
            ],
            correctOptionIndex: 1,
            explanation: "Subject 'agent' is singular, so it takes the singular verb 'handles'."
          },
          {
            questionText: "Which is a polite written greeting for a business email?",
            options: [
              "Hey client,",
              "Yo,",
              "Dear Mr. Smith,",
              "To whom it may concern (in casual chat)"
            ],
            correctOptionIndex: 2,
            explanation: "'Dear Mr. Smith,' is the standard professional written salutation."
          },
          {
            questionText: "Choose the correct pronoun: 'The client requested that ___ file be updated.'",
            options: ["she", "her", "hers", "him"],
            correctOptionIndex: 1,
            explanation: "The possessive adjective 'her' modifies the noun 'file'."
          },
          {
            questionText: "Choose the word with the correct spelling:",
            options: ["Accomodate", "Accommodate", "Acomodate", "Acommodate"],
            correctOptionIndex: 1,
            explanation: "'Accommodate' has two 'c's and two 'm's."
          },
          {
            questionText: "Which punctuation mark is used to separate items in a list?",
            options: ["Period", "Comma", "Semicolon", "Hyphen"],
            correctOptionIndex: 1,
            explanation: "Commas are used to separate items in a list."
          },
          {
            questionText: "Which is a correct capitalization rule in writing?",
            options: [
              "Capitalize every word.",
              "Capitalize the first letter of a sentence.",
              "Capitalize nouns only.",
              "Capitalize randomly."
            ],
            correctOptionIndex: 1,
            explanation: "Standard English grammar requires capitalizing the first letter of a sentence."
          },
          {
            questionText: "Complete the sentence: 'Yes, I ___ update your ticket now.'",
            options: ["will", "would", "shall", "can"],
            correctOptionIndex: 0,
            explanation: "'Will' expresses a firm future action or confirmation."
          },
          {
            questionText: "What is the opposite of 'Polite' in written communication?",
            options: ["Friendly", "Rude", "Helpful", "Gentle"],
            correctOptionIndex: 1,
            explanation: "'Rude' is the opposite of 'Polite'."
          },
          {
            questionText: "Which punctuation mark is correct for ending a question?",
            options: ["Period", "Question mark", "Exclamation mark", "Comma"],
            correctOptionIndex: 1,
            explanation: "A question mark is used to terminate interrogative sentences."
          },
          {
            questionText: "What is a professional closing salutation?",
            options: ["Bye,", "See ya,", "Sincerely,", "Whatever,"],
            correctOptionIndex: 2,
            explanation: "'Sincerely,' or 'Best regards,' are standard business salutations."
          }
        ],
        INTERMEDIATE: [
          {
            questionText: "Which subject line is most professional for resolving an outage?",
            options: [
              "Outage fixed",
              "Update: Resolved Service Outage",
              "Your service is ok now",
              "Sorry about the network"
            ],
            correctOptionIndex: 1,
            explanation: "'Update: Resolved Service Outage' is clear, concise, and professional."
          },
          {
            questionText: "Choose the correct conditional sentence for billing notification:",
            options: [
              "If you pay the bill now, your service will be restored.",
              "If you will pay the bill now, your service is restored.",
              "If you paid the bill now, your service will restore.",
              "If you pay the bill now, your service is restore."
            ],
            correctOptionIndex: 0,
            explanation: "First conditional: 'If + present simple, will + base verb'."
          },
          {
            questionText: "What does the abbreviation 'WFM' stand for in BPO writing?",
            options: [
              "Workforce Management",
              "Word Flow Management",
              "Working From Mobile",
              "Work Force Mechanism"
            ],
            correctOptionIndex: 0,
            explanation: "WFM stands for Workforce Management, which schedules and manages staff resource allocations."
          },
          {
            questionText: "Which written notification is best to put a request on hold?",
            options: [
              "Wait a minute.",
              "Please allow me 2-3 business days to investigate this details.",
              "I'm putting this on hold.",
              "Don't write, wait."
            ],
            correctOptionIndex: 1,
            explanation: "Polite phrasing stating a specific timeline is professional."
          },
          {
            questionText: "Which response shows a written paraphrase of a login problem?",
            options: [
              "I understand you are experiencing issues with logging in.",
              "Login doesn't work.",
              "You can't log in.",
              "Let me fix your login."
            ],
            correctOptionIndex: 0,
            explanation: "Paraphrasing the issue shows active listening in writing."
          },
          {
            questionText: "What is the standard structure of a professional business email?",
            options: [
              "Just writing the problem.",
              "Greeting, State purpose, Details, Call to action, Closing.",
              "Shouting and demanding.",
              "Title and footer only."
            ],
            correctOptionIndex: 1,
            explanation: "Greeting, purpose, details, action item, and closing salutation is the standard structure."
          },
          {
            questionText: "Choose the correct preposition: 'The customer was angry ___ the charges.'",
            options: ["about", "on", "for", "with"],
            correctOptionIndex: 0,
            explanation: "People are usually 'angry about' situations or billing charges."
          },
          {
            questionText: "Which written statement explains a billing cycle best?",
            options: [
              "Your invoice covers usage from June 1st to June 30th.",
              "You owe money for this cycle.",
              "Billing cycle is a bicycle.",
              "We charge you every month."
            ],
            correctOptionIndex: 0,
            explanation: "Specifying the date range makes the billing cycle clear."
          },
          {
            questionText: "Choose the correct phrase: 'Please rest assured that we ___ resolving this.'",
            options: ["are committed to", "committed for", "are commit to", "are committing for"],
            correctOptionIndex: 0,
            explanation: "'Are committed to' is followed by a gerund or noun phrase."
          },
          {
            questionText: "Which is a professional closing line for an email support ticket?",
            options: [
              "Bye.",
              "Thank you for your patience and understanding.",
              "Hope this helps, bye.",
              "Done."
            ],
            correctOptionIndex: 1,
            explanation: "'Thank you for your patience and understanding' is polite and professional."
          }
        ],
        ADVANCED: [
          {
            questionText: "Identify the grammatically correct and most professional written apology:",
            options: [
              "We apologize for the inconvenience this incident has caused you.",
              "We apologize for the inconvenience which this incident have caused to you.",
              "We are sorry for the inconveniencing that this incident caused you.",
              "We apologize about the inconvenience this incident caused for you."
            ],
            correctOptionIndex: 0,
            explanation: "'We apologize for the inconvenience this incident has caused you' uses correct prepositions and present perfect tense."
          },
          {
            questionText: "Which is the best written escalation reply?",
            options: [
              "I have escalated your request to our billing manager for formal review.",
              "I can't solve this, so my manager will read your email.",
              "Wait for someone else to reply.",
              "Escalating now."
            ],
            correctOptionIndex: 0,
            explanation: "This response indicates formal transition to a billing manager clearly."
          },
          {
            questionText: "Which written negotiation response is most professional?",
            options: [
              "No refunds.",
              "Although we cannot issue a full refund, we would like to offer a service credit.",
              "You failed to read the contract.",
              "Refund is impossible."
            ],
            correctOptionIndex: 1,
            explanation: "Validating policy while proposing a service credit is a strong written negotiation tactic."
          },
          {
            questionText: "Choose the correct sentence syntax:",
            options: [
              "Neither the manager nor the supervisors are available to comment.",
              "Neither the manager nor the supervisors is available to comment.",
              "Neither the manager nor the supervisors was available to comment.",
              "Neither the manager nor the supervisors has been available to comment."
            ],
            correctOptionIndex: 0,
            explanation: "When subjects are joined by 'neither... nor', the verb agrees with the closer subject. 'Supervisors' is plural, so it takes 'are'."
          },
          {
            questionText: "Identify the word that means 'to make a problem less severe' in written reports:",
            options: ["Aggravate", "Alleviate", "Assure", "Acquiesce"],
            correctOptionIndex: 1,
            explanation: "'Alleviate' means to make a problem or pain less severe."
          },
          {
            questionText: "What does 'First Contact Resolution' (FCR) measure in BPO written metrics?",
            options: [
              "Resolving the customer query in the first response.",
              "Replying in 3 seconds.",
              "Transferring on first try.",
              "Getting a high rating."
            ],
            correctOptionIndex: 0,
            explanation: "FCR measures resolution of issues during the initial contact."
          },
          {
            questionText: "Complete the formal sentence: 'Had we been notified earlier, we ___ the invoice.'",
            options: [
              "would have adjusted",
              "would adjust",
              "will have adjusted",
              "should adjust"
            ],
            correctOptionIndex: 0,
            explanation: "This is a third conditional inversion: 'Had we been..., we would have adjusted...'"
          },
          {
            questionText: "What does 'attrition rate' refer to in written business reviews?",
            options: [
              "The percentage of employees leaving the company.",
              "The rate of billing refunds.",
              "The speed of email answers.",
              "The cost of licenses."
            ],
            correctOptionIndex: 0,
            explanation: "'Attrition rate' is the percentage of employees leaving the company."
          },
          {
            questionText: "Which is the best written empathetic response to a high-priority outage ticket?",
            options: [
              "We are working on it.",
              "I understand how crucial this connection is, and I have flagged your ticket as high priority.",
              "Outages happen.",
              "Your ticket is queued."
            ],
            correctOptionIndex: 1,
            explanation: "Acknowledging the business criticality and taking explicit action shows empathy."
          },
          {
            questionText: "What does 'written de-escalation' involve?",
            options: [
              "Lowering the emotional stakes through objective, helpful email phrasing.",
              "Refusing to reply to angry emails.",
              "Telling the client they are wrong in a polite way.",
              "Sending an automated reply."
            ],
            correctOptionIndex: 0,
            explanation: "De-escalation in writing uses objective language and constructive solutions."
          }
        ]
      }
    };
    return list[category][level];
  }

  // ── Lesson Questions ──────────────────────────────────────────
  async getLessonQuestion(sectionId: string): Promise<LessonQuestion | null> {
    return this.lessonQuestionRepository.findOne({
      where: [
        { sectionId },
        { sessionId: sectionId }
      ]
    });
  }

  async seedLessonQuestions() {
    // Delete existing speaking prompts so they get re-seeded with updated content
    await this.lessonQuestionRepository.delete({ category: 'speaking' } as any);
    const existingWriting = await this.lessonQuestionRepository.count();
    // Only skip writing questions if they already exist
    const skipWriting = existingWriting > 0;

    this.logger.log('Seeding lesson questions and prompts into tutor_lesson_questions...');

    const speakingPrompts = {
      'sp-1-1': {
        prompt: "Vowel Sounds Practice",
        text: "Please read this sentence aloud clearly:\n'I see a big cat and a blue shoe.'",
        tip: "Say each word slowly. Focus on the vowel sounds: 'see', 'big', 'cat', 'blue', 'shoe'."
      },
      'sp-1-2': {
        prompt: "Consonant Sounds Practice",
        text: "Please read this sentence aloud clearly:\n'The dog and the cat sit on the mat.'",
        tip: "Pronounce the 'th' in 'the' and the final consonants in each word clearly."
      },
      'sp-1-3': {
        prompt: "Word Stress Practice",
        text: "Please read this sentence aloud clearly:\n'I want to record a new record today.'",
        tip: "RE-cord is a noun. re-CORD is a verb. Stress the first part for nouns."
      },
      'sp-1-4': {
        prompt: "Sentence Intonation Practice",
        text: "Please read this question aloud clearly:\n'Are you coming to the office today?'",
        tip: "Your voice should go up at the end of a yes or no question."
      },
      'sp-2-1': {
        prompt: "Call Opening Practice",
        text: "Please read this sentence aloud clearly:\n'Good morning. My name is Alex. How can I help you today?'",
        tip: "Smile while you speak. It makes your voice sound warm and friendly."
      },
      'sp-2-2': {
        prompt: "Active Listening Practice",
        text: "Please read this sentence aloud clearly:\n'I understand your problem. I will help you fix it right now.'",
        tip: "Speak with care and empathy. The customer should feel heard."
      },
      'sp-2-3': {
        prompt: "Objection Handling Practice",
        text: "Please read this sentence aloud clearly:\n'I am sorry to hear that. Let me find the best solution for you.'",
        tip: "Keep a calm and polite tone even when the customer is upset."
      },
      'sp-2-4': {
        prompt: "Call Closing Practice",
        text: "Please read this sentence aloud clearly:\n'Thank you for calling. Have a great day ahead!'",
        tip: "End the call with energy and a smile. Leave the customer feeling good."
      },
      'sp-3-1': {
        prompt: "Natural Speech Rhythm",
        text: "Please read this sentence aloud clearly:\n'I go to work every day by bus.'",
        tip: "Speak at a natural pace. Do not rush or pause too long between words."
      },
      'sp-3-2': {
        prompt: "No Filler Words",
        text: "Please read this sentence aloud clearly:\n'The meeting starts at nine in the morning.'",
        tip: "Avoid saying 'um', 'uh', or 'like' between words. Speak directly."
      },
      'sp-3-3': {
        prompt: "Speed and Clarity",
        text: "Please read this sentence aloud clearly:\n'Please hold the line. I will check your account details.'",
        tip: "Not too fast, not too slow. Every word should be clear and easy to understand."
      },
      'sp-3-4': {
        prompt: "Accent Neutralization",
        text: "Please read this sentence aloud clearly:\n'Water, butter, and better are common English words.'",
        tip: "The letter T in the middle of words often sounds like a soft D in American English."
      },
      'sp-4-1': {
        prompt: "Persuasive Language",
        text: "Please read this sentence aloud clearly:\n'This plan will save you both time and money.'",
        tip: "Stress the key benefit words: 'save', 'time', and 'money'."
      },
      'sp-4-2': {
        prompt: "Negotiation Phrases",
        text: "Please read this sentence aloud clearly:\n'Can we find a solution that works for both of us?'",
        tip: "Use a warm and open tone. Negotiation should feel like a conversation."
      },
      'sp-4-3': {
        prompt: "Escalation Handling",
        text: "Please read this sentence aloud clearly:\n'I completely understand. I will escalate this to my supervisor right away.'",
        tip: "Stay calm and confident. Your tone should reassure the customer."
      },
      'sp-4-4': {
        prompt: "Empathy in Customer Service",
        text: "Please read this sentence aloud clearly:\n'I am really sorry for the trouble. I will make sure this is resolved today.'",
        tip: "Mean what you say. Empathy is felt in the tone, not just the words."
      },
      'default': {
        prompt: "Speaking Practice",
        text: "Please read this sentence aloud clearly:\n'Hello, I am happy to help you today.'",
        tip: "Speak slowly and clearly. Make sure every word is easy to understand."
      }
    };

    const writingQuizzes = {
      'wr-1-1': {
        question: "Complete the sentence with the correct tense: 'By the time the manager arrived, the team ___ the customer issue.'",
        options: [
          "has already solved",
          "had already solved",
          "already solved",
          "will solve"
        ],
        correctIdx: 1,
        explanation: "We use the past perfect ('had already solved') for an action completed before another past action ('arrived')."
      },
      'wr-1-2': {
        question: "Identify the grammatically correct written sentence structure:",
        options: [
          "The client requested a refund, because she was unhappy with the product.",
          "The client requested a refund because she was unhappy with the product.",
          "Because she was unhappy with the product, so the client requested a refund.",
          "The client requested a refund, she was unhappy with the product."
        ],
        correctIdx: 1,
        explanation: "No comma is needed before 'because' when the dependent clause follows the main clause."
      },
      'wr-1-3': {
        question: "Which punctuation mark is correct to separate two independent clauses without a conjunction?",
        options: [
          "Comma",
          "Semicolon",
          "Colon",
          "Hyphen"
        ],
        correctIdx: 1,
        explanation: "A semicolon is used to link two independent clauses that are closely related in thought."
      },
      'wr-1-4': {
        question: "Find the common grammar error in this email draft sentence: 'Neither of the agents have completed the report.'",
        options: [
          "No error",
          "Use 'has' instead of 'have'",
          "Use 'agent' instead of 'agents'",
          "Use 'completed' instead of 'complete'"
        ],
        correctIdx: 1,
        explanation: "'Neither' is a singular pronoun and takes the singular verb 'has'."
      },
      'wr-2-1': {
        question: "Which is the most professional email subject line for an invoice update?",
        options: [
          "Urgent bill!",
          "Invoice #4562 Correction Request",
          "please read this quickly",
          "regarding your account details"
        ],
        correctIdx: 1,
        explanation: "A professional subject line should be specific, clear, and include relevant identifiers like Invoice #."
      },
      'wr-2-2': {
        question: "Which is a professional written greeting when emailing a client for the first time?",
        options: [
          "Hey Mr. Jones,",
          "Dear Mr. Jones,",
          "Hello Friend,",
          "To whom it may concern (too impersonal)"
        ],
        correctIdx: 1,
        explanation: "'Dear Mr. Jones,' is the standard professional written salutation for business correspondence."
      },
      'default': {
        question: "Choose the correct spelling:",
        options: [
          "Receiving",
          "Recieving",
          "Receving",
          "Riceiving"
        ],
        correctIdx: 0,
        explanation: "'Receive' follows the rule 'i before e except after c'."
      }
    };

    const entities = [];

    // Always re-seed speaking prompts (already deleted above)
    for (const [sectionId, val] of Object.entries(speakingPrompts)) {
      entities.push(
        this.lessonQuestionRepository.create({
          sectionId,
          sessionId: sectionId,
          category: 'speaking',
          prompt: val.prompt,
          questionText: val.text,
          options: [],
          correctOptionIndex: null,
          explanation: val.tip,
        })
      );
    }

    // Map writing quizzes — only add if they don't exist yet
    if (!skipWriting) for (const [sectionId, val] of Object.entries(writingQuizzes)) {
      entities.push(
        this.lessonQuestionRepository.create({
          sectionId,
          sessionId: sectionId,
          category: 'writing',
          prompt: 'Practice Quiz',
          questionText: val.question,
          options: val.options,
          correctOptionIndex: val.correctIdx,
          explanation: val.explanation,
        })
      );
    }

    await this.lessonQuestionRepository.save(entities);
    this.logger.log(`Seeded ${entities.length} lesson questions successfully.`);
  }
}

function computeTextSimilarity(expected: string, transcript: string): number {
  /**
   * Word-level F1 score — same metric used in reading comprehension benchmarks.
   * Returns 0–100.
   *
   * Why F1 (not edit distance):
   *   - Character edit-distance harshly penalizes word reordering
   *   - F1 handles partial coverage and reorder gracefully
   *   - 70/100 ≈ "70% of passage words spoken correctly" — a fair beginner bar
   */
  const normalize = (s: string): string[] =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  const exp = normalize(expected);
  const got = normalize(transcript);

  if (exp.length === 0 || got.length === 0) return 0;

  // Build frequency map of expected words
  const expFreq = new Map<string, number>();
  for (const w of exp) expFreq.set(w, (expFreq.get(w) ?? 0) + 1);

  // Count how many transcript words match (respecting multiplicity)
  let common = 0;
  const used = new Map<string, number>();
  for (const w of got) {
    const u = used.get(w) ?? 0;
    if (u < (expFreq.get(w) ?? 0)) {
      common++;
      used.set(w, u + 1);
    }
  }

  const precision = common / got.length;   // what fraction of what user said was correct
  const recall    = common / exp.length;   // what fraction of the passage was covered

  if (precision + recall === 0) return 0;

  const f1 = (2 * precision * recall) / (precision + recall);
  return Math.round(f1 * 100);
}

function generateSpeakingFeedback(
  score: number,
  tip: string,
  expected: string,
  transcript: string,
): string {
  // Find words in passage that were not spoken
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  const expWords = new Set(normalize(expected));
  const gotWords = new Set(normalize(transcript));
  const missed = [...expWords].filter(w => !gotWords.has(w)).slice(0, 5);

  const missedHint = missed.length > 0
    ? ` Words to work on: "${missed.join('", "')}".`
    : '';

  if (score >= 90) return `Excellent reading! (${score}%) ${tip}`;
  if (score >= 70) return `Good job, you passed! (${score}%) ${tip}${missedHint}`;
  if (score >= 50) return `Almost there (${score}%). Read each word clearly.${missedHint} Tip: ${tip}`;
  return `Keep practising (${score}%). Try to read every word in the passage.${missedHint} Tip: ${tip}`;
}