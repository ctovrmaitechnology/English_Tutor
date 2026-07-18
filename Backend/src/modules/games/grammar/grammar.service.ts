import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeminiService } from '../../gemini/gemini.service';
import { GameSession } from '../entities/game-session.entity';
import { StartGameDto } from '../dto/start-game.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';

@Injectable()
export class GrammarService {
  private readonly logger = new Logger(GrammarService.name);

  constructor(
    @InjectRepository(GameSession)
    private sessionRepo: Repository<GameSession>,
    private gemini: GeminiService,
  ) {}

  // ════════════════════════════════════════════
  // GAME 1 — GRAMMAR NINJA
  // Tap the incorrect word before it disappears
  // ════════════════════════════════════════════

  async startGrammarNinja(userId: string, dto: StartGameDto) {
    const data = await this.gemini.generateJSON<{
      questions: {
        sentence: string;
        words: string[];
        errorIndex: number;
        errorWord: string;
        correctWord: string;
        explanation: string;
      }[];
    }>(
      `Generate 10 Grammar Ninja questions for BPO English learners.
       Difficulty: ${dto.difficulty || 'BEGINNER'}
       
       Each sentence must have EXACTLY ONE grammar error.
       Mix: tense errors, subject-verb agreement, articles, prepositions.
       Use professional/workplace sentences.
       
       Return JSON only:
       {
         "questions": [
           {
             "sentence": "She go to the office every day.",
             "words": ["She", "go", "to", "the", "office", "every", "day"],
             "errorIndex": 1,
             "errorWord": "go",
             "correctWord": "goes",
             "explanation": "Use 'goes' for third-person singular present tense."
           }
         ]
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'GRAMMAR_NINJA',
      category: 'GRAMMAR',
      difficulty: dto.difficulty || 'BEGINNER',
      score: 0,
      maxScore: data.questions.length * 15,
      gameData: {
        questions: data.questions,
        currentQuestion: 0,
        lives: 3,
        streak: 0,
      },
    });

    const saved = await this.sessionRepo.save(session);
    const first = data.questions[0];

    return {
      sessionId: saved.id,
      totalQuestions: data.questions.length,
      lives: 3,
      currentQuestion: {
        number: 1,
        sentence: first.sentence,
        words: first.words,
      },
    };
  }

  async answerGrammarNinja(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;
    const current = gameData.questions[gameData.currentQuestion];

    // User submits the index of the word they tapped
    const tappedIndex = parseInt(dto.answer);
    const isCorrect = tappedIndex === current.errorIndex;

    // Speed bonus — faster tap = more points
    const basePoints = 10;
    const speedBonus =
      dto.timeMs < 2000 ? 5 : dto.timeMs < 4000 ? 3 : 0;

    if (isCorrect) {
      gameData.streak += 1;
      const streakBonus = gameData.streak >= 3 ? 3 : 0;
      session.score += basePoints + speedBonus + streakBonus;
    } else {
      gameData.lives -= 1;
      gameData.streak = 0;
    }

    gameData.currentQuestion += 1;
    const gameOver =
      gameData.currentQuestion >= gameData.questions.length ||
      gameData.lives <= 0;

    if (gameOver) {
      const xpEarned = Math.floor(session.score / 2);
      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: session.score,
        xpEarned,
        completedAt: new Date(),
        gameData,
      });

      return {
        correct: isCorrect,
        errorWord: current.errorWord,
        correctWord: current.correctWord,
        explanation: current.explanation,
        gameOver: true,
        finalScore: session.score,
        xpEarned,
      };
    }

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    const next = gameData.questions[gameData.currentQuestion];

    return {
      correct: isCorrect,
      errorWord: current.errorWord,
      correctWord: current.correctWord,
      explanation: current.explanation,
      score: session.score,
      lives: gameData.lives,
      streak: gameData.streak,
      gameOver: false,
      nextQuestion: {
        number: gameData.currentQuestion + 1,
        sentence: next.sentence,
        words: next.words,
      },
    };
  }

  // ════════════════════════════════════════════
  // GAME 2 — SENTENCE SURGEON
  // Drag and drop words into correct order
  // ════════════════════════════════════════════

  async startSentenceSurgeon(userId: string, dto: StartGameDto) {
    const data = await this.gemini.generateJSON<{
      questions: {
        jumbledWords: string[];
        correctSentence: string;
        hint: string;
      }[];
    }>(
      `Generate 8 Sentence Surgeon questions for BPO English learners.
       Difficulty: ${dto.difficulty || 'BEGINNER'}
       
       Each question has words that need to be arranged into a correct sentence.
       Use professional/workplace sentences.
       Jumble the words randomly.
       
       Return JSON only:
       {
         "questions": [
           {
             "jumbledWords": ["customer", "the", "immediately", "assist", "Please"],
             "correctSentence": "Please assist the customer immediately.",
             "hint": "Start with a polite request word."
           }
         ]
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'SENTENCE_SURGEON',
      category: 'GRAMMAR',
      difficulty: dto.difficulty || 'BEGINNER',
      score: 0,
      maxScore: data.questions.length * 15,
      gameData: {
        questions: data.questions,
        currentQuestion: 0,
        hintsUsed: 0,
      },
    });

    const saved = await this.sessionRepo.save(session);
    const first = data.questions[0];

    return {
      sessionId: saved.id,
      totalQuestions: data.questions.length,
      currentQuestion: {
        number: 1,
        jumbledWords: first.jumbledWords,
      },
    };
  }

  async answerSentenceSurgeon(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;
    const current = gameData.questions[gameData.currentQuestion];

    // Validate answer with Gemini for flexibility
    const validation = await this.gemini.generateJSON<{
      correct: boolean;
      feedback: string;
    }>(
      `Sentence Surgeon validation:
       Correct sentence: "${current.correctSentence}"
       User's answer: "${dto.answer}"
       
       Accept the answer if it is grammatically correct and means the same thing.
       Minor punctuation differences are acceptable.
       
       Return JSON only: { "correct": true/false, "feedback": "brief feedback" }`
    );

    const speedBonus = dto.timeMs < 10000 ? 5 : dto.timeMs < 20000 ? 2 : 0;

    if (validation.correct) {
      session.score += 10 + speedBonus;
    }

    gameData.currentQuestion += 1;
    const gameOver =
      gameData.currentQuestion >= gameData.questions.length;

    if (gameOver) {
      const xpEarned = Math.floor(session.score / 2);
      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: session.score,
        xpEarned,
        completedAt: new Date(),
        gameData,
      });

      return {
        correct: validation.correct,
        correctSentence: current.correctSentence,
        feedback: validation.feedback,
        gameOver: true,
        finalScore: session.score,
        xpEarned,
      };
    }

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    const next = gameData.questions[gameData.currentQuestion];

    return {
      correct: validation.correct,
      correctSentence: current.correctSentence,
      feedback: validation.feedback,
      score: session.score,
      gameOver: false,
      nextQuestion: {
        number: gameData.currentQuestion + 1,
        jumbledWords: next.jumbledWords,
      },
    };
  }

  async getSentenceSurgeonHint(userId: string, sessionId: string) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;
    const current = gameData.questions[gameData.currentQuestion];

    gameData.hintsUsed += 1;
    // Deduct 3 points for using a hint
    session.score = Math.max(0, session.score - 3);

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    return {
      hint: current.hint,
      pointsDeducted: 3,
      currentScore: session.score,
    };
  }

  // ════════════════════════════════════════════
  // GAME 3 — ERROR HUNT
  // Find 3 hidden grammar mistakes in a paragraph
  // ════════════════════════════════════════════

  async startErrorHunt(userId: string, dto: StartGameDto) {
    const difficulty = dto.difficulty || 'BEGINNER';
    const errorCount = difficulty === 'BEGINNER' ? 3
      : difficulty === 'INTERMEDIATE' ? 4 : 5;

    const data = await this.gemini.generateJSON<{
      paragraph: string;
      errors: {
        errorWord: string;
        correctWord: string;
        position: number;
        explanation: string;
      }[];
    }>(
      `Generate an Error Hunt paragraph for BPO English learners.
       Difficulty: ${difficulty}
       
       Write a professional BPO/customer service paragraph with EXACTLY ${errorCount} grammar errors.
       Errors should be: tense mistakes, wrong prepositions, subject-verb disagreement.
       
       Return JSON only:
       {
         "paragraph": "The customer were very upset about their order. She have waited for three days. Our team is working to resolved the issue as soon as possible.",
         "errors": [
           {
             "errorWord": "were",
             "correctWord": "was",
             "position": 2,
             "explanation": "Use 'was' for singular subject 'customer'."
           }
         ]
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'ERROR_HUNT',
      category: 'GRAMMAR',
      difficulty,
      score: 0,
      maxScore: errorCount * 20,
      gameData: {
        paragraph: data.paragraph,
        errors: data.errors,
        totalErrors: errorCount,
        foundErrors: [],
        timeLimit: 120, // 2 minutes
        startTime: Date.now(),
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      paragraph: data.paragraph,
      totalErrors: errorCount,
      timeLimit: 120,
      instructions: `Find all ${errorCount} grammar errors in the paragraph above.`,
    };
  }

  async submitErrorHunt(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;

    // User submits array of errors as JSON string
    // Format: [{ errorWord: "were", correction: "was" }]
    let userErrors: { errorWord: string; correction: string }[] = [];
    try {
      userErrors = JSON.parse(dto.answer);
    } catch {
      userErrors = [];
    }

    // Validate with Gemini
    const validation = await this.gemini.generateJSON<{
      found: { errorWord: string; correct: boolean; feedback: string }[];
      missed: { errorWord: string; correctWord: string; explanation: string }[];
      score: number;
    }>(
      `Error Hunt validation:
       Original paragraph errors: ${JSON.stringify(gameData.errors)}
       User found these errors: ${JSON.stringify(userErrors)}
       
       Check each error the user found:
       - Is the error word correct?
       - Is their correction valid?
       
       Return JSON only:
       {
         "found": [
           { "errorWord": "were", "correct": true, "feedback": "Great catch!" }
         ],
         "missed": [
           { "errorWord": "have", "correctWord": "has", "explanation": "..." }
         ],
         "score": 40
       }`
    );

    const xpEarned = Math.floor(validation.score / 2);

    await this.sessionRepo.update(sessionId, {
      completed: true,
      score: validation.score,
      xpEarned,
      accuracy: gameData.errors.length > 0
        ? (validation.found.filter(f => f.correct).length / gameData.errors.length) * 100
        : 0,
      completedAt: new Date(),
    });

    return {
      score: validation.score,
      xpEarned,
      found: validation.found,
      missed: validation.missed,
      correctParagraph: gameData.errors.reduce(
        (para: string, err: any) => para.replace(err.errorWord, err.correctWord),
        gameData.paragraph,
      ),
      message: `You found ${validation.found.filter(f => f.correct).length} out of ${gameData.errors.length} errors!`,
    };
  }

  // ════════════════════════════════════════════
  // GAME 4 — TENSE TRANSFORMER
  // Transform sentences to requested tense
  // ════════════════════════════════════════════

  async startTenseTransformer(userId: string, dto: StartGameDto) {
    const data = await this.gemini.generateJSON<{
      questions: {
        sentence: string;
        fromTense: string;
        toTense: string;
        correctAnswer: string;
        hint: string;
      }[];
    }>(
      `Generate 10 Tense Transformer questions for BPO English learners.
       Difficulty: ${dto.difficulty || 'BEGINNER'}
       
       Each question gives a sentence in one tense and asks to transform to another.
       Use professional/workplace sentences.
       Mix: present→past, past→future, present→present perfect, etc.
       
       Return JSON only:
       {
         "questions": [
           {
             "sentence": "I handle customer complaints every day.",
             "fromTense": "Simple Present",
             "toTense": "Simple Past",
             "correctAnswer": "I handled customer complaints every day.",
             "hint": "Change the main verb to its past form."
           }
         ]
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'TENSE_TRANSFORMER',
      category: 'GRAMMAR',
      difficulty: dto.difficulty || 'BEGINNER',
      score: 0,
      maxScore: data.questions.length * 15,
      gameData: {
        questions: data.questions,
        currentQuestion: 0,
        streak: 0,
      },
    });

    const saved = await this.sessionRepo.save(session);
    const first = data.questions[0];

    return {
      sessionId: saved.id,
      totalQuestions: data.questions.length,
      currentQuestion: {
        number: 1,
        sentence: first.sentence,
        fromTense: first.fromTense,
        toTense: first.toTense,
        instruction: `Transform from ${first.fromTense} to ${first.toTense}`,
      },
    };
  }

  async answerTenseTransformer(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;
    const current = gameData.questions[gameData.currentQuestion];

    // Validate with Gemini
    const validation = await this.gemini.generateJSON<{
      correct: boolean;
      feedback: string;
      grammarNote: string;
    }>(
      `Tense Transformer validation:
       Original sentence: "${current.sentence}"
       Required transformation: ${current.fromTense} → ${current.toTense}
       Expected answer: "${current.correctAnswer}"
       User's answer: "${dto.answer}"
       
       Check if the user correctly transformed the tense.
       Accept minor variations if grammatically correct.
       
       Return JSON only:
       {
         "correct": true/false,
         "feedback": "Good job! / Not quite...",
         "grammarNote": "Brief grammar tip"
       }`
    );

    if (validation.correct) {
      gameData.streak += 1;
      const streakBonus = gameData.streak >= 3 ? 5 : 0;
      session.score += 10 + streakBonus;
    } else {
      gameData.streak = 0;
    }

    gameData.currentQuestion += 1;
    const gameOver =
      gameData.currentQuestion >= gameData.questions.length;

    if (gameOver) {
      const xpEarned = Math.floor(session.score / 2);
      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: session.score,
        xpEarned,
        completedAt: new Date(),
        gameData,
      });

      return {
        correct: validation.correct,
        correctAnswer: current.correctAnswer,
        feedback: validation.feedback,
        grammarNote: validation.grammarNote,
        gameOver: true,
        finalScore: session.score,
        xpEarned,
      };
    }

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    const next = gameData.questions[gameData.currentQuestion];

    return {
      correct: validation.correct,
      correctAnswer: current.correctAnswer,
      feedback: validation.feedback,
      grammarNote: validation.grammarNote,
      score: session.score,
      streak: gameData.streak,
      gameOver: false,
      nextQuestion: {
        number: gameData.currentQuestion + 1,
        sentence: next.sentence,
        fromTense: next.fromTense,
        toTense: next.toTense,
        instruction: `Transform from ${next.fromTense} to ${next.toTense}`,
      },
    };
  }

  // ════════════════════════════════════════════
  // PERSONAL BEST
  // ════════════════════════════════════════════

  async getPersonalBest(userId: string) {
    const gameTypes = [
      'GRAMMAR_NINJA',
      'SENTENCE_SURGEON',
      'ERROR_HUNT',
      'TENSE_TRANSFORMER',
    ];

    const results = await Promise.all(
      gameTypes.map(gameType =>
        this.sessionRepo.findOne({
          where: { userId, gameType, completed: true },
          order: { score: 'DESC' },
          select: ['gameType', 'score', 'accuracy', 'completedAt'],
        })
      )
    );

    return results.filter(Boolean);
  }

  // ════════════════════════════════════════════
  // SHARED HELPER
  // ════════════════════════════════════════════

  private async getActiveSession(userId: string, sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId, completed: false },
    });
    if (!session) throw new NotFoundException('Game session not found');
    return session;
  }
}