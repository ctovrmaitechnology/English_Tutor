import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeminiService } from '../../gemini/gemini.service';
import { GameSession } from '../entities/game-session.entity';
import { StartGameDto } from '../dto/start-game.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';

// Spin wheel reward types
const SPIN_REWARDS = [
  { id: 'DOUBLE_XP',      label: 'Double XP',            emoji: '⚡', description: 'Your next game session gives 2x XP!', weight: 15 },
  { id: 'BONUS_XP_50',    label: '+50 Bonus XP',          emoji: '🌟', description: 'Instant 50 XP added to your account!', weight: 25 },
  { id: 'BONUS_XP_100',   label: '+100 Bonus XP',         emoji: '💎', description: 'Instant 100 XP added to your account!', weight: 10 },
  { id: 'VOCAB_CHALLENGE', label: 'Vocabulary Challenge', emoji: '📚', description: 'A special bonus vocabulary challenge unlocked!', weight: 20 },
  { id: 'STREAK_SAVE',    label: 'Streak Shield',         emoji: '🛡️', description: 'One free streak save added to your shields!', weight: 15 },
  { id: 'MYSTERY_WORD',   label: 'Mystery Word',          emoji: '🔮', description: 'Learn a special word to use today!', weight: 15 },
];

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);

  constructor(
    @InjectRepository(GameSession)
    private sessionRepo: Repository<GameSession>,
    private gemini: GeminiService,
  ) {}

  // ════════════════════════════════════════════
  // GAME 1 — DAILY SPIN WHEEL
  // One spin per day — random reward
  // ════════════════════════════════════════════

  async checkSpinAvailable(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySpin = await this.sessionRepo.findOne({
      where: {
        userId,
        gameType: 'SPIN_WHEEL',
        completed: true,
      },
      order: { completedAt: 'DESC' },
    });

    if (todaySpin && todaySpin.completedAt >= today) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const hoursLeft = Math.ceil(
        (tomorrow.getTime() - Date.now()) / (1000 * 60 * 60),
      );

      return {
        canSpin: false,
        message: `You already spun today! Come back in ${hoursLeft} hours.`,
        hoursUntilNextSpin: hoursLeft,
        lastReward: todaySpin.gameData['reward'] || null,
      };
    }

    return {
      canSpin: true,
      message: 'Your daily spin is ready! 🎰',
      rewards: SPIN_REWARDS.map(r => ({
        id: r.id,
        label: r.label,
        emoji: r.emoji,
      })),
    };
  }

  async spin(userId: string) {
    // Check if already spun today
    const check = await this.checkSpinAvailable(userId);
    if (!check.canSpin) {
      throw new BadRequestException(check.message);
    }

    // Weighted random reward selection
    const reward = this.selectWeightedReward();

    // Handle MYSTERY_WORD — generate a word
    let mysteryWord = null;
    if (reward.id === 'MYSTERY_WORD') {
      mysteryWord = await this.gemini.generateJSON<{
        word: string;
        meaning: string;
        example: string;
        challenge: string;
      }>(
        `Generate a mystery word challenge for a BPO English learner.
         Pick an impressive professional word.
         Return JSON only:
         {
           "word": "articulate",
           "meaning": "able to express thoughts clearly and effectively",
           "example": "She was very articulate during the client presentation.",
           "challenge": "Use this word naturally in your next voice session today!"
         }`
      );
    }

    // Save spin record
    const session = this.sessionRepo.create({
      userId,
      gameType: 'SPIN_WHEEL',
      category: 'DAILY',
      score: reward.id === 'BONUS_XP_50' ? 50 : reward.id === 'BONUS_XP_100' ? 100 : 0,
      completed: true,
      completedAt: new Date(),
      xpEarned: reward.id === 'BONUS_XP_50' ? 50 : reward.id === 'BONUS_XP_100' ? 100 : 0,
      gameData: {
        reward: reward.id,
        rewardLabel: reward.label,
        mysteryWord,
        appliedAt: new Date(),
        applied: false,
      },
    });

    await this.sessionRepo.save(session);

    return {
      reward: {
        id: reward.id,
        label: reward.label,
        emoji: reward.emoji,
        description: reward.description,
      },
      mysteryWord,
      message: `🎉 You landed on: ${reward.label}! ${reward.description}`,
      xpAwarded: session.xpEarned,
    };
  }

  private selectWeightedReward() {
    const totalWeight = SPIN_REWARDS.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;

    for (const reward of SPIN_REWARDS) {
      random -= reward.weight;
      if (random <= 0) return reward;
    }

    return SPIN_REWARDS[0];
  }

  async getActiveReward(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySpin = await this.sessionRepo.findOne({
      where: { userId, gameType: 'SPIN_WHEEL', completed: true },
      order: { completedAt: 'DESC' },
    });

    if (!todaySpin || todaySpin.completedAt < today) {
      return { hasReward: false };
    }

    const gameData = todaySpin.gameData as any;
    return {
      hasReward: true,
      reward: gameData.reward,
      rewardLabel: gameData.rewardLabel,
      applied: gameData.applied,
      mysteryWord: gameData.mysteryWord,
    };
  }

  // ════════════════════════════════════════════
  // GAME 2 — BOSS BATTLE
  // Weekly Sunday challenge
  // AI plays an extremely demanding customer
  // Score 75%+ = defeat the boss
  // ════════════════════════════════════════════

async checkBossAvailable(userId: string) {
  // ✅ Unlimited — always allow Boss Battle
  return {
    canChallenge: true,
    message: '⚔️ The Boss Battle is ready! Can you handle the toughest customer?',
  };
}

  async startBossBattle(userId: string) {
    const check = await this.checkBossAvailable(userId);
    if (!check.canChallenge) {
      throw new BadRequestException(check.message);
    }

    const boss = await this.gemini.generateJSON<{
      bossName: string;
      bossTitle: string;
      scenario: string;
      personality: string;
      demands: string[];
      openingMessage: string;
    }>(
      `Create the BOSS BATTLE scenario for BPO training.
       This is the hardest challenge — the most difficult customer possible.
       
       The customer should be:
       - Extremely upset and escalating
       - Making unreasonable demands
       - Threatening to cancel, sue, or go to social media
       - Interrupting and challenging everything the agent says
       
       Return JSON only:
       {
         "bossName": "Mr. Harrison",
         "bossTitle": "The Impossible Customer",
         "scenario": "Description of the worst possible situation",
         "personality": "Aggressive, demanding, threatening",
         "demands": ["Immediate full refund", "Compensation", "Speak to CEO"],
         "openingMessage": "Boss's aggressive opening statement"
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'BOSS_BATTLE',
      category: 'DAILY',
      score: 0,
      maxScore: 100,
      gameData: {
        bossName: boss.bossName,
        bossTitle: boss.bossTitle,
        scenario: boss.scenario,
        personality: boss.personality,
        demands: boss.demands,
        messages: [{ role: 'model', text: boss.openingMessage }],
        turnCount: 0,
        maxTurns: 10,
        defeated: false,
        winThreshold: 75,
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      bossName: boss.bossName,
      bossTitle: boss.bossTitle,
      scenario: boss.scenario,
      demands: boss.demands,
      bossMessage: boss.openingMessage,
      maxTurns: 10,
      winThreshold: 75,
      warning: '⚠️ This is the hardest challenge. Score 75+ to defeat the boss!',
    };
  }

  async replyBossBattle(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;

    gameData.messages.push({ role: 'user', text: dto.answer });
    gameData.turnCount += 1;

    // Strict evaluation — boss battle standards
    const evaluation = await this.gemini.generateJSON<{
      score: number;
      handled: boolean;
      feedback: string;
      bossAngryLevel: number;
    }>(
      `Boss Battle evaluation — strict scoring:
       
       Boss scenario: "${gameData.scenario}"
       Boss demands: ${JSON.stringify(gameData.demands)}
       Agent response: "${dto.answer}"
       Turn number: ${gameData.turnCount}
       
       Score harshly — this is the hardest challenge.
       Did agent: maintain composure, address demands professionally,
       use empathy, avoid escalating further?
       
       Return JSON only:
       {
         "score": 0-10,
         "handled": true/false,
         "feedback": "Brief coaching note",
         "bossAngryLevel": 1-10
       }`
    );

    session.score += evaluation.score;

    const isLastTurn =
      gameData.turnCount >= gameData.maxTurns;

    if (isLastTurn) {
      const avgScore = Math.round(
        (session.score / (gameData.maxTurns * 10)) * 100,
      );
      const defeated = avgScore >= gameData.winThreshold;
      const xpEarned = defeated ? 300 : Math.floor(avgScore / 2);

      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: avgScore,
        xpEarned,
        accuracy: avgScore,
        completedAt: new Date(),
        gameData: { ...gameData, defeated },
      });

      return {
        gameOver: true,
        finalScore: avgScore,
        defeated,
        xpEarned,
        message: defeated
          ? `🏆 BOSS DEFEATED! Score: ${avgScore}/100. Outstanding performance!`
          : `💀 Boss wins this week. Score: ${avgScore}/100. You need 75+ to win. Try again next Sunday!`,
        badge: defeated ? 'BOSS_SLAYER' : null,
      };
    }

// ✅ Fix — ensure history starts with 'user' role (Gemini requirement)
const rawMessages = gameData.messages;
const safeMessages = rawMessages[0]?.role === 'model'
  ? [{ role: 'user', text: 'Begin the customer service scenario.' }, ...rawMessages]
  : rawMessages;

// Boss responds aggressively
const bossReply = await this.gemini.chat(
  safeMessages,
  `You are ${gameData.bossName}, the most difficult customer ever.
   Personality: ${gameData.personality}
   Scenario: ${gameData.scenario}
   
   React to the agent's response. If they were good, calm down slightly.
   If they were bad or generic, escalate further.
   Boss angry level now: ${evaluation.bossAngryLevel}/10
   Keep responses realistic, aggressive, 2-3 sentences.`
);

    gameData.messages.push({ role: 'model', text: bossReply });

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    return {
      gameOver: false,
      bossReply,
      feedback: evaluation.feedback,
      turnNumber: gameData.turnCount,
      turnsLeft: gameData.maxTurns - gameData.turnCount,
      bossAngryLevel: evaluation.bossAngryLevel,
      currentScore: Math.round((session.score / (gameData.maxTurns * 10)) * 100),
    };
  }

  // ════════════════════════════════════════════
  // GAME 3 — STREAK SHIELD
  // Earned every 7-day streak
  // Up to 3 shields at a time
  // Saves streak if you miss a day
  // ════════════════════════════════════════════

  async getStreakInfo(userId: string) {
    // Get streak data from game sessions
    const lastSession = await this.sessionRepo.findOne({
      where: { userId, completed: true },
      order: { completedAt: 'DESC' },
    });

    const shieldRecord = await this.sessionRepo.findOne({
      where: { userId, gameType: 'STREAK_SHIELD' },
      order: { completedAt: 'DESC' },
    });

    const shields = shieldRecord
      ? (shieldRecord.gameData as any).shields || 0
      : 0;

    return {
      shields,
      maxShields: 3,
      message: shields > 0
        ? `You have ${shields} streak shield(s). They protect your streak if you miss a day!`
        : 'Earn shields by maintaining a 7-day streak!',
      howToEarn: 'Complete any game 7 days in a row to earn a shield.',
    };
  }

  async awardStreakShield(userId: string) {
    const current = await this.sessionRepo.findOne({
      where: { userId, gameType: 'STREAK_SHIELD' },
      order: { completedAt: 'DESC' },
    });

    const currentShields = current
      ? (current.gameData as any).shields || 0
      : 0;

    if (currentShields >= 3) {
      return {
        awarded: false,
        message: 'Maximum shields reached (3). Use them before earning more!',
        shields: currentShields,
      };
    }

    const newShields = currentShields + 1;

    await this.sessionRepo.save(
      this.sessionRepo.create({
        userId,
        gameType: 'STREAK_SHIELD',
        category: 'DAILY',
        score: 0,
        completed: true,
        completedAt: new Date(),
        xpEarned: 0,
        gameData: { shields: newShields },
      })
    );

    return {
      awarded: true,
      shields: newShields,
      message: `🛡️ Streak Shield awarded! You now have ${newShields} shield(s).`,
    };
  }

  async useStreakShield(userId: string) {
    const current = await this.sessionRepo.findOne({
      where: { userId, gameType: 'STREAK_SHIELD' },
      order: { completedAt: 'DESC' },
    });

    const currentShields = current
      ? (current.gameData as any).shields || 0
      : 0;

    if (currentShields <= 0) {
      throw new BadRequestException(
        'No streak shields available. Keep your streak going to earn one!',
      );
    }

    const newShields = currentShields - 1;

    await this.sessionRepo.save(
      this.sessionRepo.create({
        userId,
        gameType: 'STREAK_SHIELD',
        category: 'DAILY',
        score: 0,
        completed: true,
        completedAt: new Date(),
        xpEarned: 0,
        gameData: { shields: newShields },
      })
    );

    return {
      used: true,
      shieldsRemaining: newShields,
      message: `🛡️ Shield used! Your streak is protected. ${newShields} shield(s) remaining.`,
    };
  }

  // ════════════════════════════════════════════
  // GAME 4 — TREASURE HUNT
  // Monthly — 10 vocabulary clues hidden
  // Completing activities unlocks clues
  // ════════════════════════════════════════════

  async getOrCreateTreasureHunt(userId: string) {
    const monthStart = this.getMonthStart();

    const existing = await this.sessionRepo.findOne({
      where: { userId, gameType: 'TREASURE_HUNT', completed: false },
      order: { startedAt: 'DESC' },
    });

    if (existing && existing.startedAt >= monthStart) {
      return existing;
    }

    // Create new monthly treasure hunt
    const words = await this.gemini.generateJSON<{
      treasureWords: {
        word: string;
        meaning: string;
        clue: string;
        unlockedBy: string;
      }[];
    }>(
      `Generate 10 treasure hunt vocabulary words for BPO English learners.
       Each word has a clue and is unlocked by completing a specific activity.
       
       Activities: VOICE_SESSION, GRAMMAR_GAME, VOCABULARY_GAME, 
                   BPO_GAME, ASSESSMENT, STORY_GAME, DAILY_CHALLENGE,
                   SPEED_SPEAK, ERROR_HUNT, BOSS_BATTLE
       
       Return JSON only:
       {
         "treasureWords": [
           {
             "word": "impeccable",
             "meaning": "perfect and without faults",
             "clue": "Hidden in the Grammar forest 🌲",
             "unlockedBy": "GRAMMAR_GAME"
           }
         ]
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'TREASURE_HUNT',
      category: 'DAILY',
      score: 0,
      maxScore: 100,
      gameData: {
        month: monthStart.toISOString(),
        words: words.treasureWords,
        foundWords: [],
        totalWords: 10,
      },
    });

    return this.sessionRepo.save(session);
  }

  async getTreasureHuntStatus(userId: string) {
    const hunt = await this.getOrCreateTreasureHunt(userId);
    const gameData = hunt.gameData as any;

    const foundCount = gameData.foundWords.length;
    const totalCount = gameData.totalWords;

    return {
      huntId: hunt.id,
      month: new Date(gameData.month).toLocaleString('default', { month: 'long', year: 'numeric' }),
      progress: `${foundCount}/${totalCount}`,
      foundWords: gameData.foundWords,
      nextClue: gameData.words.find(
        (w: any) => !gameData.foundWords.includes(w.word)
      ) ? {
        clue: gameData.words.find(
          (w: any) => !gameData.foundWords.includes(w.word)
        ).clue,
        unlockedBy: gameData.words.find(
          (w: any) => !gameData.foundWords.includes(w.word)
        ).unlockedBy,
      } : null,
      completed: foundCount >= totalCount,
      message: foundCount >= totalCount
        ? '🏆 Treasure Hunt complete! Amazing vocabulary hunter!'
        : `Keep playing to find all ${totalCount} treasure words!`,
    };
  }

  async unlockTreasureWord(userId: string, activityType: string) {
    const hunt = await this.getOrCreateTreasureHunt(userId);
    const gameData = hunt.gameData as any;

    // Find word unlocked by this activity
    const wordToUnlock = gameData.words.find(
      (w: any) =>
        w.unlockedBy === activityType &&
        !gameData.foundWords.includes(w.word),
    );

    if (!wordToUnlock) {
      return { unlocked: false, message: 'No new treasure word for this activity.' };
    }

    gameData.foundWords.push(wordToUnlock.word);
    const allFound = gameData.foundWords.length >= gameData.totalWords;

    await this.sessionRepo.update(hunt.id, {
      gameData,
      score: Math.round((gameData.foundWords.length / gameData.totalWords) * 100),
      completed: allFound,
      completedAt: allFound ? new Date() : null,
      xpEarned: allFound ? 500 : 0,
    });

    return {
      unlocked: true,
      word: wordToUnlock.word,
      meaning: wordToUnlock.meaning,
      message: `🔮 Treasure word found: "${wordToUnlock.word}"! ${wordToUnlock.meaning}`,
      totalFound: gameData.foundWords.length,
      huntComplete: allFound,
      badge: allFound ? 'TREASURE_HUNTER' : null,
      bonusXP: allFound ? 500 : 50,
    };
  }

  // ════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════

  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  private getMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private async getActiveSession(userId: string, sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId, completed: false },
    });
    if (!session) throw new NotFoundException('Game session not found');
    return session;
  }
}