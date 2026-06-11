import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeminiService } from '../../gemini/gemini.service';
import { GameSession } from '../entities/game-session.entity';
import { StartGameDto } from '../dto/start-game.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';

@Injectable()
export class VocabularyService {
  private readonly logger = new Logger(VocabularyService.name);

  constructor(
    @InjectRepository(GameSession)
    private sessionRepo: Repository<GameSession>,
    private gemini: GeminiService,
  ) {}

  // ════════════════════════════════════════════
  // GAME 1 — WORD CHAIN VS AI
  // ════════════════════════════════════════════

  async startWordChain(userId: string, dto: StartGameDto) {
    // AI makes the first word
    const firstWord = await this.gemini.generateJSON<{ word: string }>(
      `Give me one simple English word to start a word chain game.
       Return JSON only: { "word": "apple" }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'WORD_CHAIN',
      category: 'VOCABULARY',
      difficulty: dto.difficulty || 'BEGINNER',
      gameData: {
        currentWord: firstWord.word,
        usedWords: [firstWord.word.toLowerCase()],
        lives: 3,
        chain: [{ by: 'ai', word: firstWord.word }],
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      message: `Word Chain started! AI says: "${firstWord.word}"`,
      aiWord: firstWord.word,
      nextLetter: firstWord.word.slice(-1).toUpperCase(),
      lives: 3,
    };
  }

 async playWordChain(userId: string, sessionId: string, dto: SubmitAnswerDto) {
  const session = await this.getActiveSession(userId, sessionId);
  const gameData = session.gameData as any;
  const userWord = dto.answer.trim().toLowerCase();

  // Check time (>5 seconds = lose a life)
  if (dto.timeMs > 9000) {
    gameData.lives -= 1;
    if (gameData.lives <= 0) {
      return await this.endWordChain(session, gameData, 'TIME_UP');
    }
    await this.sessionRepo.update(sessionId, { gameData });
    return {
      valid: false,
      reason: 'TOO_SLOW',
      message: 'You took more than 5 seconds!',
      lives: gameData.lives,
      lostLife: true,
    };
  }

  // ✅ Check letter match IN CODE — not Gemini
  // Simple string comparison — no AI hallucination possible
  const currentWord = gameData.currentWord.toLowerCase();
  const requiredLetter = currentWord.slice(-1); // last letter of AI's word
  const userFirstLetter = userWord[0];

  if (!userWord) {
    gameData.lives -= 1;
    await this.sessionRepo.update(sessionId, { gameData });
    return {
      valid: false,
      reason: 'Empty answer',
      lives: gameData.lives,
      lostLife: true,
    };
  }

  if (userFirstLetter !== requiredLetter) {
    gameData.lives -= 1;
    if (gameData.lives <= 0) {
      return await this.endWordChain(session, gameData, 'WRONG_WORD');
    }
    await this.sessionRepo.update(sessionId, { gameData });
    return {
      valid: false,
      reason: `"${userWord}" must start with "${requiredLetter.toUpperCase()}", not "${userFirstLetter.toUpperCase()}"`,
      lives: gameData.lives,
      lostLife: true,
    };
  }

  // ✅ Check if word was already used IN CODE
  if (gameData.usedWords.includes(userWord)) {
    gameData.lives -= 1;
    if (gameData.lives <= 0) {
      return await this.endWordChain(session, gameData, 'WRONG_WORD');
    }
    await this.sessionRepo.update(sessionId, { gameData });
    return {
      valid: false,
      reason: `"${userWord}" was already used!`,
      lives: gameData.lives,
      lostLife: true,
    };
  }

  // ✅ Use Gemini ONLY to check if it's a real English word
  const wordCheck = await this.gemini.generateJSON<{
    isReal: boolean;
    reason: string;
  }>(
    `Is "${userWord}" a real English word?
     Answer honestly — common words only.
     Return JSON only: { "isReal": true/false, "reason": "brief reason" }`
  );

  if (!wordCheck.isReal) {
    gameData.lives -= 1;
    if (gameData.lives <= 0) {
      return await this.endWordChain(session, gameData, 'WRONG_WORD');
    }
    await this.sessionRepo.update(sessionId, { gameData });
    return {
      valid: false,
      reason: `"${userWord}" is not a valid English word.`,
      lives: gameData.lives,
      lostLife: true,
    };
  }

  // ✅ Valid word — AI responds
  gameData.usedWords.push(userWord);
  gameData.chain.push({ by: 'user', word: userWord, valid: true });
  session.score += 10;

  const aiResponse = await this.gemini.generateJSON<{
    word: string;
    canContinue: boolean;
  }>(
    `Word chain game. User said: "${userWord}"
     Used words: ${JSON.stringify(gameData.usedWords)}
     
     Respond with a valid English word starting with "${userWord.slice(-1)}".
     Must NOT be in the used words list.
     If no valid word exists, set canContinue to false.
     
     Return JSON only: { "word": "string", "canContinue": true/false }`
  );

  if (!aiResponse.canContinue) {
    gameData.chain.push({ by: 'ai', word: null, valid: false });
    return await this.endWordChain(session, gameData, 'AI_STUCK');
  }

  gameData.usedWords.push(aiResponse.word.toLowerCase());
  gameData.currentWord = aiResponse.word;
  gameData.chain.push({ by: 'ai', word: aiResponse.word, valid: true });

  await this.sessionRepo.update(sessionId, {
    score: session.score,
    gameData,
  });

  return {
    valid: true,
    yourWord: userWord,
    aiWord: aiResponse.word,
    nextLetter: aiResponse.word.slice(-1).toUpperCase(),
    score: session.score,
    lives: gameData.lives,
    chainLength: gameData.chain.filter((c: any) => c.valid).length,
  };
}
  private async endWordChain(session: GameSession, gameData: any, reason: string) {
    const xpEarned = Math.floor(session.score / 2);
    await this.sessionRepo.update(session.id, {
      completed: true,
      score: session.score,
      xpEarned,
      completedAt: new Date(),
      gameData,
    });

    return {
      gameOver: true,
      reason,
      finalScore: session.score,
      chainLength: gameData.chain.filter(c => c.valid).length,
      xpEarned,
      message: reason === 'AI_STUCK'
        ? '🎉 You won! AI ran out of words!'
        : `Game over! You scored ${session.score} points.`,
    };
  }

  // ════════════════════════════════════════════
  // GAME 2 — SYNONYM STORM
  // ════════════════════════════════════════════

  async startSynonymStorm(userId: string, dto: StartGameDto) {
    const wordData = await this.gemini.generateJSON<{
      word: string;
      validSynonyms: string[];
    }>(
      `Generate a word for a synonym finding game for BPO English learners.
       Choose a common professional/workplace word.
       Return JSON only:
       {
         "word": "assist",
         "validSynonyms": ["help", "support", "aid", "facilitate", "enable"]
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'SYNONYM_STORM',
      category: 'VOCABULARY',
      difficulty: dto.difficulty || 'BEGINNER',
      gameData: {
        targetWord: wordData.word,
        validSynonyms: wordData.validSynonyms,
        foundSynonyms: [],
        startTime: Date.now(),
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      word: wordData.word,
      timeLimit: 30,
      message: `Find as many synonyms as you can for "${wordData.word}" in 30 seconds!`,
    };
  }

  async submitSynonymStorm(userId: string, sessionId: string, dto: SubmitAnswerDto) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;

    // User submits array of synonyms as comma-separated string
    const userSynonyms = dto.answer
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    // Validate with Gemini
    const validation = await this.gemini.generateJSON<{
      valid: string[];
      invalid: string[];
      missed: string[];
    }>(
      `Synonym validation for the word: "${gameData.targetWord}"
       User submitted these synonyms: ${JSON.stringify(userSynonyms)}
       Known valid synonyms: ${JSON.stringify(gameData.validSynonyms)}
       
       Also accept other valid synonyms not in the known list.
       Return JSON only:
       {
         "valid": ["synonyms that are correct"],
         "invalid": ["words that are not synonyms"],
         "missed": ["synonyms user could have found"]
       }`
    );

    const score = validation.valid.length * 10;
    const xpEarned = Math.floor(score / 2);

    await this.sessionRepo.update(sessionId, {
      completed: true,
      score,
      xpEarned,
      accuracy: userSynonyms.length > 0
        ? (validation.valid.length / userSynonyms.length) * 100
        : 0,
      completedAt: new Date(),
      gameData: { ...gameData, foundSynonyms: validation.valid },
    });

    return {
      score,
      xpEarned,
      validSynonyms: validation.valid,
      invalidWords: validation.invalid,
      missedSynonyms: validation.missed,
      message: `You found ${validation.valid.length} valid synonyms! Score: ${score}`,
    };
  }

  // ════════════════════════════════════════════
  // GAME 3 — WORD AMNESIA
  // ════════════════════════════════════════════

  async getWordAmnesiaQuestion(difficulty: string = 'BEGINNER') {
    const question = await this.gemini.generateJSON<{
      sentence: string;
      blankWord: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }>(
      `Create a Word Amnesia question for BPO English learners.
       Difficulty: ${difficulty}
       
       Create a sentence with one word missing (shown as ___).
       Provide 4 options where only one is correct.
       Use professional/workplace vocabulary.
       
       Return JSON only:
       {
         "sentence": "Please ___ the customer's complaint immediately.",
         "blankWord": "address",
         "options": ["address", "ignore", "delay", "forget"],
         "correctIndex": 0,
         "explanation": "'Address' means to deal with or handle a situation."
       }`
    );

    return question;
  }

  async startWordAmnesia(userId: string, dto: StartGameDto) {
    const questions = await Promise.all(
      Array(10).fill(null).map(() =>
        this.getWordAmnesiaQuestion(dto.difficulty || 'BEGINNER')
      )
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'WORD_AMNESIA',
      category: 'VOCABULARY',
      difficulty: dto.difficulty || 'BEGINNER',
      gameData: {
        questions,
        currentQuestion: 0,
        streak: 0,
        lives: 3,
      },
    });

    const saved = await this.sessionRepo.save(session);
    const first = questions[0];

    return {
      sessionId: saved.id,
      totalQuestions: 10,
      question: {
        number: 1,
        sentence: first.sentence,
        options: first.options,
      },
    };
  }

  async answerWordAmnesia(userId: string, sessionId: string, dto: SubmitAnswerDto) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;
    const current = gameData.questions[gameData.currentQuestion];
    const selectedIndex = parseInt(dto.answer);
    const isCorrect = selectedIndex === current.correctIndex;

    if (isCorrect) {
      // Streak bonus
      gameData.streak += 1;
      const streakBonus = gameData.streak >= 3 ? 5 : 0;
      session.score += 10 + streakBonus;
    } else {
      gameData.lives -= 1;
      gameData.streak = 0;
      session.score = Math.max(0, session.score - 5); // wrong answer costs points
    }

    gameData.currentQuestion += 1;
    const isLastQuestion = gameData.currentQuestion >= gameData.questions.length;
    const gameOver = isLastQuestion || gameData.lives <= 0;

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
        correctAnswer: current.options[current.correctIndex],
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
      correctAnswer: current.options[current.correctIndex],
      explanation: current.explanation,
      score: session.score,
      lives: gameData.lives,
      streak: gameData.streak,
      gameOver: false,
      nextQuestion: {
        number: gameData.currentQuestion + 1,
        sentence: next.sentence,
        options: next.options,
      },
    };
  }

  // ════════════════════════════════════════════
  // GAME 4 — VOCABULARY SPEED RUN
  // ════════════════════════════════════════════

  async startSpeedRun(userId: string, dto: StartGameDto) {
    const words = await this.gemini.generateJSON<{
      words: { word: string; meaning: string; example: string }[];
    }>(
      `Generate 10 vocabulary words for BPO English learners.
       Difficulty: ${dto.difficulty || 'BEGINNER'}
       
       Choose professional/workplace words.
       Return JSON only:
       {
         "words": [
           {
             "word": "escalate",
             "meaning": "To raise an issue to a higher authority for resolution",
             "example": "I will escalate this to my supervisor."
           }
         ]
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'SPEED_RUN',
      category: 'VOCABULARY',
      difficulty: dto.difficulty || 'BEGINNER',
      gameData: {
        words: words.words,
        currentWord: 0,
        timePerWord: 10, // 10 seconds per word
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      totalWords: 10,
      timePerWord: 10,
      firstWord: words.words[0].word,
      wordNumber: 1,
    };
  }

  async answerSpeedRun(userId: string, sessionId: string, dto: SubmitAnswerDto) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;
    const current = gameData.words[gameData.currentWord];

    // Time check — 10 seconds per word
    const tooSlow = dto.timeMs > 10000;

    let isCorrect = false;
    let feedback = '';

    if (!tooSlow) {
      // Validate meaning with Gemini
      const validation = await this.gemini.generateJSON<{
        correct: boolean;
        feedback: string;
      }>(
        `Vocabulary check:
         Word: "${current.word}"
         Correct meaning: "${current.meaning}"
         User's answer: "${dto.answer}"
         
         Is the user's answer correct or close enough?
         Accept partial answers if they capture the main meaning.
         Return JSON only: { "correct": true/false, "feedback": "brief feedback" }`
      );

      isCorrect = validation.correct;
      feedback = validation.feedback;
    } else {
      feedback = 'Too slow! Try to answer within 10 seconds.';
    }

    if (isCorrect) {
      const speedBonus = dto.timeMs < 5000 ? 5 : 0;
      session.score += 10 + speedBonus;
    }

    gameData.currentWord += 1;
    const isLastWord = gameData.currentWord >= gameData.words.length;

    if (isLastWord) {
      const xpEarned = Math.floor(session.score / 2);
      const accuracy = (session.score / (gameData.words.length * 10)) * 100;

      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: session.score,
        accuracy,
        xpEarned,
        completedAt: new Date(),
        gameData,
      });

      return {
        correct: isCorrect,
        correctMeaning: current.meaning,
        feedback,
        gameOver: true,
        finalScore: session.score,
        xpEarned,
        accuracy: Math.round(accuracy),
      };
    }

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    return {
      correct: isCorrect,
      correctMeaning: current.meaning,
      example: current.example,
      feedback,
      score: session.score,
      gameOver: false,
      nextWord: gameData.words[gameData.currentWord].word,
      wordNumber: gameData.currentWord + 1,
    };
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

  async getPersonalBest(userId: string) {
    const gameTypes = ['WORD_CHAIN', 'SYNONYM_STORM', 'WORD_AMNESIA', 'SPEED_RUN'];

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
}