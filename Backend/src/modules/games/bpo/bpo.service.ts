import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeminiService } from '../../gemini/gemini.service';
import { GameSession } from '../entities/game-session.entity';
import { StartGameDto } from '../dto/start-game.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';

@Injectable()
export class BpoService {
  private readonly logger = new Logger(BpoService.name);

  constructor(
    @InjectRepository(GameSession)
    private sessionRepo: Repository<GameSession>,
    private gemini: GeminiService,
  ) {}

  // ════════════════════════════════════════════
  // GAME 1 — ANGRY CUSTOMER SIMULATOR
  // AI plays a frustrated customer
  // User must handle professionally
  // ════════════════════════════════════════════

  async startAngryCustomer(userId: string, dto: StartGameDto) {
    const difficulty = dto.difficulty || 'BEGINNER';

    const scenario = await this.gemini.generateJSON<{
      scenario: string;
      customerName: string;
      issue: string;
      angryLevel: string;
      firstMessage: string;
    }>(
      `Create an Angry Customer scenario for BPO training.
       Difficulty: ${difficulty}
       
       BEGINNER: mildly upset, simple issue (wrong item delivered)
       INTERMEDIATE: very frustrated, billing issue
       ADVANCED: extremely angry, repeated failures, threatening to cancel
       
       Return JSON only:
       {
         "scenario": "Brief description of the situation",
         "customerName": "John",
         "issue": "Double charged for subscription",
         "angryLevel": "Frustrated",
         "firstMessage": "What the customer says first (angry, realistic)"
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'ANGRY_CUSTOMER',
      category: 'BPO',
      difficulty,
      score: 0,
      maxScore: 100,
      gameData: {
        scenario: scenario.scenario,
        customerName: scenario.customerName,
        issue: scenario.issue,
        angryLevel: scenario.angryLevel,
        messages: [
          { role: 'model', text: scenario.firstMessage }
        ],
        turnCount: 0,
        maxTurns: 8,
        metrics: {
          empathy: 0,
          professionalism: 0,
          resolution: 0,
          grammar: 0,
          fillerWords: 0,
        },
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      scenario: scenario.scenario,
      customerName: scenario.customerName,
      issue: scenario.issue,
      customerMessage: scenario.firstMessage,
      maxTurns: 8,
      instructions: 'Handle this customer professionally. Use empathy, offer solutions, maintain a calm tone.',
    };
  }

  async replyAngryCustomer(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;

    gameData.messages.push({ role: 'user', text: dto.answer });
    gameData.turnCount += 1;

    // Evaluate agent's response quality
    const evaluation = await this.gemini.generateJSON<{
      score: number;
      empathy: boolean;
      professional: boolean;
      fillerWords: string[];
      feedback: string;
      customerResolved: boolean;
    }>(
      `Evaluate this BPO agent's response:
       
       Customer issue: "${gameData.issue}"
       Customer anger level: "${gameData.angryLevel}"
       Agent's response: "${dto.answer}"
       
       Return JSON only:
       {
         "score": 0-15,
         "empathy": true/false,
         "professional": true/false,
         "fillerWords": ["um", "uh", "like"],
         "feedback": "Brief coaching tip",
         "customerResolved": true/false
       }`
    );

    session.score += evaluation.score;

    // Track metrics
    if (evaluation.empathy) gameData.metrics.empathy += 1;
    if (evaluation.professional) gameData.metrics.professionalism += 1;
    gameData.metrics.fillerWords += evaluation.fillerWords.length;

    const isLastTurn =
      gameData.turnCount >= gameData.maxTurns || evaluation.customerResolved;

    if (isLastTurn) {
      // Get final score and detailed feedback
      const finalEval = await this.gemini.generateJSON<{
        overallScore: number;
        empathyScore: number;
        professionalismScore: number;
        resolutionScore: number;
        grammarScore: number;
        summary: string;
        improvements: string[];
      }>(
        `Final evaluation for BPO Angry Customer simulation:
         
         Conversation history: ${JSON.stringify(gameData.messages)}
         Customer issue: "${gameData.issue}"
         
         Score each area out of 25:
         Return JSON only:
         {
           "overallScore": 0-100,
           "empathyScore": 0-25,
           "professionalismScore": 0-25,
           "resolutionScore": 0-25,
           "grammarScore": 0-25,
           "summary": "Overall performance summary",
           "improvements": ["tip1", "tip2", "tip3"]
         }`
      );

      const xpEarned = Math.floor(finalEval.overallScore / 2);

      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: finalEval.overallScore,
        xpEarned,
        accuracy: finalEval.overallScore,
        completedAt: new Date(),
        gameData: {
          ...gameData,
          messages: [...gameData.messages, { role: 'model', text: '(Call ended)' }],
        },
      });

      return {
        gameOver: true,
        customerResolved: evaluation.customerResolved,
        scores: {
          overall: finalEval.overallScore,
          empathy: finalEval.empathyScore,
          professionalism: finalEval.professionalismScore,
          resolution: finalEval.resolutionScore,
          grammar: finalEval.grammarScore,
        },
        summary: finalEval.summary,
        improvements: finalEval.improvements,
        xpEarned,
      };
    }

    // AI customer responds
    const customerReply = await this.gemini.chat(
      gameData.messages,
      `You are ${gameData.customerName}, an angry customer with this issue: "${gameData.issue}".
       Anger level: ${gameData.angryLevel}.
       React naturally to the agent's response.
       If they were helpful, calm down slightly.
       If they were dismissive, get more upset.
       Keep responses realistic and short (1-3 sentences).
       Stay in character throughout.`
    );

    gameData.messages.push({ role: 'model', text: customerReply });

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    return {
      gameOver: false,
      turnNumber: gameData.turnCount,
      turnsLeft: gameData.maxTurns - gameData.turnCount,
      feedback: evaluation.feedback,
      fillerWords: evaluation.fillerWords,
      customerReply,
      currentScore: session.score,
    };
  }

  // ════════════════════════════════════════════
  // GAME 2 — EMAIL RACE
  // Write a professional email reply
  // ════════════════════════════════════════════

  async startEmailRace(userId: string, dto: StartGameDto) {
    const difficulty = dto.difficulty || 'BEGINNER';

    const scenario = await this.gemini.generateJSON<{
      customerEmail: string;
      customerName: string;
      issue: string;
      requiredPoints: string[];
    }>(
      `Create an Email Race scenario for BPO training.
       Difficulty: ${difficulty}
       
       Write a customer complaint email that needs a professional reply.
       Include what points the reply MUST cover.
       
       Return JSON only:
       {
         "customerEmail": "Full text of customer's complaint email",
         "customerName": "Sarah Johnson",
         "issue": "Brief issue description",
         "requiredPoints": [
           "Acknowledge the inconvenience",
           "Explain the cause",
           "Offer a solution",
           "Provide timeline"
         ]
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'EMAIL_RACE',
      category: 'BPO',
      difficulty,
      score: 0,
      maxScore: 100,
      gameData: {
        customerEmail: scenario.customerEmail,
        customerName: scenario.customerName,
        issue: scenario.issue,
        requiredPoints: scenario.requiredPoints,
        startTime: Date.now(),
        timeLimit: difficulty === 'BEGINNER' ? 180 : difficulty === 'INTERMEDIATE' ? 120 : 90,
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      customerEmail: scenario.customerEmail,
      customerName: scenario.customerName,
      requiredPoints: scenario.requiredPoints,
      timeLimit: session.gameData['timeLimit'],
      instructions: 'Write a professional email reply covering all required points.',
    };
  }

  async submitEmailRace(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;

    const timeTaken = Math.floor((Date.now() - gameData.startTime) / 1000);
    const tooSlow = timeTaken > gameData.timeLimit;

    const evaluation = await this.gemini.generateJSON<{
      grammarScore: number;
      toneScore: number;
      completenessScore: number;
      professionalismScore: number;
      overallScore: number;
      coveredPoints: string[];
      missedPoints: string[];
      grammarErrors: string[];
      suggestions: string[];
      improvedVersion: string;
    }>(
      `Evaluate this BPO email reply:
       
       Customer's email: "${gameData.customerEmail}"
       Required points to cover: ${JSON.stringify(gameData.requiredPoints)}
       Agent's reply: "${dto.answer}"
       Time taken: ${timeTaken} seconds (limit: ${gameData.timeLimit}s)
       
       Score each area out of 25. Deduct 10 points if reply is too slow.
       
       Return JSON only:
       {
         "grammarScore": 0-25,
         "toneScore": 0-25,
         "completenessScore": 0-25,
         "professionalismScore": 0-25,
         "overallScore": 0-100,
         "coveredPoints": ["points that were addressed"],
         "missedPoints": ["required points that were missed"],
         "grammarErrors": ["list of grammar mistakes"],
         "suggestions": ["improvement tips"],
         "improvedVersion": "A better version of the email"
       }`
    );

    const finalScore = tooSlow
      ? Math.max(0, evaluation.overallScore - 10)
      : evaluation.overallScore;

    const xpEarned = Math.floor(finalScore / 2);

    await this.sessionRepo.update(sessionId, {
      completed: true,
      score: finalScore,
      xpEarned,
      accuracy: finalScore,
      completedAt: new Date(),
    });

    return {
      score: finalScore,
      xpEarned,
      timeTaken,
      tooSlow,
      breakdown: {
        grammar: evaluation.grammarScore,
        tone: evaluation.toneScore,
        completeness: evaluation.completenessScore,
        professionalism: evaluation.professionalismScore,
      },
      coveredPoints: evaluation.coveredPoints,
      missedPoints: evaluation.missedPoints,
      grammarErrors: evaluation.grammarErrors,
      suggestions: evaluation.suggestions,
      improvedVersion: evaluation.improvedVersion,
    };
  }

  // ════════════════════════════════════════════
  // GAME 3 — HOLD MUSIC
  // Rapid scenarios every 10 seconds
  // Score = responses without filler words
  // ════════════════════════════════════════════

  async startHoldMusic(userId: string, dto: StartGameDto) {
    const scenarios = await this.gemini.generateJSON<{
      scenarios: {
        situation: string;
        expectedTone: string;
        keywords: string[];
      }[];
    }>(
      `Generate 10 rapid BPO Hold Music scenarios for training.
       Each scenario is a sudden customer situation that needs an instant response.
       
       Return JSON only:
       {
         "scenarios": [
           {
             "situation": "Customer says: I have been on hold for 30 minutes!",
             "expectedTone": "Apologetic and empathetic",
             "keywords": ["apologize", "understand", "immediately"]
           }
         ]
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'HOLD_MUSIC',
      category: 'BPO',
      difficulty: dto.difficulty || 'BEGINNER',
      score: 0,
      maxScore: scenarios.scenarios.length * 10,
      gameData: {
        scenarios: scenarios.scenarios,
        currentScenario: 0,
        fillerWords: ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'sort of', 'kind of'],
        totalFillerCount: 0,
        cleanResponses: 0,
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      totalScenarios: scenarios.scenarios.length,
      timePerScenario: 10,
      firstScenario: {
        number: 1,
        situation: scenarios.scenarios[0].situation,
      },
      instructions: 'Respond professionally in under 10 seconds. Avoid filler words (um, uh, like).',
    };
  }

  async answerHoldMusic(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;
    const current = gameData.scenarios[gameData.currentScenario];

    const tooSlow = dto.timeMs > 10000;

    // Detect filler words
    const response = dto.answer.toLowerCase();
    const foundFillers = gameData.fillerWords.filter((fw: string) =>
      response.includes(fw)
    );

    let roundScore = 0;
    let feedback = '';

    if (tooSlow) {
      feedback = '⏰ Too slow! You must respond within 10 seconds.';
    } else if (foundFillers.length > 0) {
      roundScore = 3;
      feedback = `Avoid filler words: ${foundFillers.join(', ')}`;
      gameData.totalFillerCount += foundFillers.length;
    } else {
      // Validate quality with Gemini
      const validation = await this.gemini.generateJSON<{
        appropriate: boolean;
        score: number;
        feedback: string;
      }>(
        `BPO Hold Music response evaluation:
         Situation: "${current.situation}"
         Expected tone: "${current.expectedTone}"
         Agent's response: "${dto.answer}"
         Time taken: ${dto.timeMs}ms
         
         Is this response appropriate and professional?
         Return JSON only:
         {
           "appropriate": true/false,
           "score": 0-10,
           "feedback": "brief feedback"
         }`
      );

      roundScore = validation.score;
      feedback = validation.feedback;
      if (validation.appropriate) gameData.cleanResponses += 1;
    }

    session.score += roundScore;
    gameData.currentScenario += 1;

    const gameOver = gameData.currentScenario >= gameData.scenarios.length;

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
        gameOver: true,
        roundScore,
        fillerWords: foundFillers,
        feedback,
        finalScore: session.score,
        xpEarned,
        stats: {
          cleanResponses: gameData.cleanResponses,
          totalFillerWords: gameData.totalFillerCount,
          outOf: gameData.scenarios.length,
        },
      };
    }

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    const next = gameData.scenarios[gameData.currentScenario];

    return {
      gameOver: false,
      roundScore,
      fillerWords: foundFillers,
      feedback,
      score: session.score,
      nextScenario: {
        number: gameData.currentScenario + 1,
        situation: next.situation,
      },
    };
  }

  // ════════════════════════════════════════════
  // GAME 4 — JARGON MASTER
  // Rapid-fire BPO vocabulary quiz
  // ════════════════════════════════════════════

  async startJargonMaster(userId: string, dto: StartGameDto) {
    const data = await this.gemini.generateJSON<{
      questions: {
        question: string;
        type: string;
        correctAnswer: string;
        options?: string[];
        explanation: string;
      }[];
    }>(
      `Generate 15 Jargon Master questions for BPO English learners.
       Difficulty: ${dto.difficulty || 'BEGINNER'}
       
       Mix 3 question types:
       1. DEFINITION: "What does SLA mean?"
       2. USAGE: "Use 'escalate' in a professional sentence"
       3. SYNONYM: "What is a more professional way to say 'I don't know'?"
       
       Return JSON only:
       {
         "questions": [
           {
             "question": "What does AHT stand for in a call centre?",
             "type": "DEFINITION",
             "correctAnswer": "Average Handle Time — the average time spent on a customer call",
             "options": ["Average Handle Time", "Agent Help Tool", "Automated Hold Timer", "Active Hour Tracking"],
             "explanation": "AHT is a key metric measuring efficiency of call handling."
           }
         ]
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'JARGON_MASTER',
      category: 'BPO',
      difficulty: dto.difficulty || 'BEGINNER',
      score: 0,
      maxScore: data.questions.length * 10,
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
      firstQuestion: {
        number: 1,
        question: first.question,
        type: first.type,
        options: first.options || null,
      },
    };
  }

  async answerJargonMaster(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;
    const current = gameData.questions[gameData.currentQuestion];

    let isCorrect = false;
    let feedback = '';

    if (current.type === 'DEFINITION' && current.options) {
      // MCQ — check index
      const selectedIndex = parseInt(dto.answer);
      const correctIndex = current.options.indexOf(current.correctAnswer);
      isCorrect = selectedIndex === correctIndex;
      feedback = isCorrect ? '✅ Correct!' : `❌ The correct answer is: ${current.correctAnswer}`;
    } else {
      // Open answer — validate with Gemini
      const validation = await this.gemini.generateJSON<{
        correct: boolean;
        feedback: string;
      }>(
        `BPO Jargon Master answer check:
         Question: "${current.question}"
         Type: ${current.type}
         Expected answer: "${current.correctAnswer}"
         User's answer: "${dto.answer}"
         
         Accept if the user's answer captures the core meaning.
         For USAGE type, check if the word is used correctly in context.
         
         Return JSON only: { "correct": true/false, "feedback": "brief feedback" }`
      );

      isCorrect = validation.correct;
      feedback = validation.feedback;
    }

    const speedBonus = dto.timeMs < 5000 ? 3 : 0;

    if (isCorrect) {
      gameData.streak += 1;
      const streakBonus = gameData.streak >= 3 ? 5 : 0;
      session.score += 10 + speedBonus + streakBonus;
    } else {
      gameData.streak = 0;
    }

    gameData.currentQuestion += 1;
    const gameOver = gameData.currentQuestion >= gameData.questions.length;

    if (gameOver) {
      const xpEarned = Math.floor(session.score / 2);
      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: session.score,
        xpEarned,
        accuracy: (session.score / (gameData.questions.length * 10)) * 100,
        completedAt: new Date(),
        gameData,
      });

      return {
        correct: isCorrect,
        correctAnswer: current.correctAnswer,
        explanation: current.explanation,
        feedback,
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
      correctAnswer: current.correctAnswer,
      explanation: current.explanation,
      feedback,
      score: session.score,
      streak: gameData.streak,
      gameOver: false,
      nextQuestion: {
        number: gameData.currentQuestion + 1,
        question: next.question,
        type: next.type,
        options: next.options || null,
      },
    };
  }

  // ════════════════════════════════════════════
  // PERSONAL BEST
  // ════════════════════════════════════════════

  async getPersonalBest(userId: string) {
    const gameTypes = [
      'ANGRY_CUSTOMER',
      'EMAIL_RACE',
      'HOLD_MUSIC',
      'JARGON_MASTER',
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
  // HELPER
  // ════════════════════════════════════════════

  private async getActiveSession(userId: string, sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId, completed: false },
    });
    if (!session) throw new NotFoundException('Game session not found');
    return session;
  }
}