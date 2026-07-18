import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSession } from './entities/game-session.entity';

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(
    @InjectRepository(GameSession)
    private sessionRepo: Repository<GameSession>,
  ) {}

  // ── All game categories with metadata ───────────────────────
  getCategories() {
    return {
      categories: [
        {
          id: 'VOCABULARY',
          label: 'Vocabulary Games',
          emoji: '📚',
          color: '#6366f1',
          description: 'Build and expand your English word power',
          games: [
            { id: 'WORD_CHAIN',   label: 'Word Chain vs AI',       xp: '+30 XP', difficulty: 'Medium' },
            { id: 'SYNONYM_STORM', label: 'Synonym Storm',          xp: '+25 XP', difficulty: 'Easy'   },
            { id: 'WORD_AMNESIA', label: 'Word Amnesia',            xp: '+20 XP', difficulty: 'Easy'   },
            { id: 'SPEED_RUN',    label: 'Vocabulary Speed Run',    xp: '+35 XP', difficulty: 'Hard'   },
          ],
        },
        {
          id: 'GRAMMAR',
          label: 'Grammar Games',
          emoji: '✍️',
          color: '#10b981',
          description: 'Master English grammar rules through play',
          games: [
            { id: 'GRAMMAR_NINJA',      label: 'Grammar Ninja',       xp: '+30 XP', difficulty: 'Medium' },
            { id: 'SENTENCE_SURGEON',   label: 'Sentence Surgeon',    xp: '+25 XP', difficulty: 'Medium' },
            { id: 'ERROR_HUNT',         label: 'Error Hunt',          xp: '+35 XP', difficulty: 'Hard'   },
            { id: 'TENSE_TRANSFORMER',  label: 'Tense Transformer',   xp: '+30 XP', difficulty: 'Medium' },
          ],
        },
        {
          id: 'BPO',
          label: 'BPO Scenario Games',
          emoji: '🏢',
          color: '#3b82f6',
          description: 'Real-world BPO call simulations and roleplay',
          games: [
            { id: 'ANGRY_CUSTOMER', label: 'Angry Customer Simulator', xp: '+50 XP', difficulty: 'Hard'   },
            { id: 'EMAIL_RACE',     label: 'Email Race',               xp: '+40 XP', difficulty: 'Medium' },
            { id: 'HOLD_MUSIC',     label: 'Hold Music',               xp: '+35 XP', difficulty: 'Medium' },
            { id: 'JARGON_MASTER',  label: 'Jargon Master',            xp: '+30 XP', difficulty: 'Easy'   },
          ],
        },
        {
          id: 'STORY',
          label: 'Story & Creative Games',
          emoji: '🎭',
          color: '#8b5cf6',
          description: 'Express yourself with storytelling and creative writing',
          games: [
            { id: 'STORY_BUILDER',  label: 'Story Builder',         xp: '+40 XP', difficulty: 'Medium' },
            { id: 'NEWS_ANCHOR',    label: 'News Anchor',           xp: '+35 XP', difficulty: 'Medium' },
            { id: 'JOB_INTERVIEW',  label: 'Job Interview Sim',     xp: '+50 XP', difficulty: 'Hard'   },
            { id: 'DEBATE_ME',      label: 'Debate Me',             xp: '+45 XP', difficulty: 'Hard'   },
          ],
        },
        {
          id: 'VOICE',
          label: 'Voice & Pronunciation',
          emoji: '🎙️',
          color: '#f59e0b',
          description: 'Improve your accent and pronunciation skills',
          games: [
            { id: 'TONGUE_TWISTER', label: 'Tongue Twister Challenge', xp: '+25 XP', difficulty: 'Medium' },
            { id: 'ECHO_MASTER',    label: 'Echo Master',              xp: '+30 XP', difficulty: 'Medium' },
            { id: 'ACCENT_DRILL',   label: 'Accent Drill',             xp: '+35 XP', difficulty: 'Hard'   },
            { id: 'SPEED_SPEAK',    label: 'Speed Speak',              xp: '+30 XP', difficulty: 'Medium' },
          ],
        },
        {
          id: 'DAILY',
          label: 'Daily & Special Games',
          emoji: '⭐',
          color: '#ec4899',
          description: 'Fresh daily challenges and special event games',
          games: [
            { id: 'SPIN_WHEEL',    label: 'Daily Spin Wheel',    xp: 'Varies',   difficulty: 'Easy'   },
            { id: 'BOSS_BATTLE',   label: 'Boss Battle',         xp: '+300 XP',  difficulty: 'Expert' },
            { id: 'STREAK_SHIELD', label: 'Streak Shield',       xp: 'Passive',  difficulty: 'Easy'   },
            { id: 'TREASURE_HUNT', label: 'Treasure Hunt',       xp: '+500 XP',  difficulty: 'Monthly'},
          ],
        },
      ],
    };
  }

  // ── Full game history (all categories) ──────────────────────
  async getFullHistory(userId: string, limit = 20) {
    const sessions = await this.sessionRepo.find({
      where: { userId, completed: true },
      order: { completedAt: 'DESC' },
      take: limit,
      select: [
        'id', 'gameType', 'category', 'difficulty',
        'score', 'maxScore', 'accuracy', 'xpEarned',
        'duration', 'completedAt',
      ],
    });

    return {
      total: sessions.length,
      sessions,
    };
  }

  // ── Overall stats across all games ──────────────────────────
  async getOverallStats(userId: string) {
    const sessions = await this.sessionRepo.find({
      where: { userId, completed: true },
      select: [
        'gameType', 'category', 'score',
        'maxScore', 'accuracy', 'xpEarned',
      ],
    });

    if (sessions.length === 0) {
      return {
        totalGamesPlayed: 0,
        totalXPEarned: 0,
        averageScore: 0,
        averageAccuracy: 0,
        favouriteCategory: null,
        categoryBreakdown: [],
        gameTypeBreakdown: [],
      };
    }

    const totalXP = sessions.reduce((sum, s) => sum + (s.xpEarned || 0), 0);
    const avgScore = Math.round(
      sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length,
    );
    const avgAccuracy = Math.round(
      sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / sessions.length,
    );

    // Category breakdown
    const categoryMap: Record<string, { played: number; totalXP: number }> = {};
    for (const s of sessions) {
      if (!categoryMap[s.category]) {
        categoryMap[s.category] = { played: 0, totalXP: 0 };
      }
      categoryMap[s.category].played += 1;
      categoryMap[s.category].totalXP += s.xpEarned || 0;
    }

    const categoryBreakdown = Object.entries(categoryMap).map(
      ([category, data]) => ({ category, ...data }),
    );

    // Favourite category = most played
    const favourite = categoryBreakdown.reduce((a, b) =>
      a.played > b.played ? a : b,
    );

    // Game type breakdown
    const gameTypeMap: Record<string, { played: number; bestScore: number }> = {};
    for (const s of sessions) {
      if (!gameTypeMap[s.gameType]) {
        gameTypeMap[s.gameType] = { played: 0, bestScore: 0 };
      }
      gameTypeMap[s.gameType].played += 1;
      if (s.score > gameTypeMap[s.gameType].bestScore) {
        gameTypeMap[s.gameType].bestScore = s.score;
      }
    }

    const gameTypeBreakdown = Object.entries(gameTypeMap).map(
      ([gameType, data]) => ({ gameType, ...data }),
    );

    return {
      totalGamesPlayed: sessions.length,
      totalXPEarned: totalXP,
      averageScore: avgScore,
      averageAccuracy: avgAccuracy,
      favouriteCategory: favourite.category,
      categoryBreakdown,
      gameTypeBreakdown,
    };
  }

  // ── Personal best across ALL game types ─────────────────────
  async getAllPersonalBests(userId: string) {
    const results = await this.sessionRepo
      .createQueryBuilder('session')
      .select('session.gameType', 'gameType')
      .addSelect('session.category', 'category')
      .addSelect('MAX(session.score)', 'score')
      .addSelect('MAX(session.accuracy)', 'accuracy')
      .addSelect('MAX(session.completedAt)', 'completedAt')
      .where('session.userId = :userId', { userId })
      .andWhere('session.completed = true')
      .groupBy('session.gameType')
      .addGroupBy('session.category')
      .getRawMany();

    const grouped: Record<string, any[]> = {};
    for (const row of results) {
      const cat = row.category || 'UNCATEGORIZED';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        gameType: row.gameType,
        category: row.category,
        score: Number(row.score) || 0,
        accuracy: Number(row.accuracy) || 0,
        completedAt: row.completedAt,
      });
    }

    return grouped;
  }

  // ── Recent activity feed ─────────────────────────────────────
  async getRecentActivity(userId: string) {
    const sessions = await this.sessionRepo.find({
      where: { userId, completed: true },
      order: { completedAt: 'DESC' },
      take: 5,
      select: [
        'gameType', 'category', 'score',
        'xpEarned', 'completedAt',
      ],
    });

    return sessions.map(s => ({
      gameType: s.gameType,
      category: s.category,
      score: s.score,
      xpEarned: s.xpEarned,
      completedAt: s.completedAt,
      message: `Played ${s.gameType.replace(/_/g, ' ')} — scored ${s.score} pts (+${s.xpEarned} XP)`,
    }));
  }

  // ── XP leaderboard (weekly) ──────────────────────────────────
  async getWeeklyLeaderboard() {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const results = await this.sessionRepo
      .createQueryBuilder('session')
      .select('session.userId', 'userId')
      .addSelect('SUM(session.xpEarned)', 'weeklyXP')
      .addSelect('COUNT(session.id)', 'gamesPlayed')
      .where('session.completed = true')
      .andWhere('session.completedAt >= :weekStart', { weekStart })
      .groupBy('session.userId')
      .orderBy('weeklyXP', 'DESC')
      .limit(10)
      .getRawMany();

    return results.map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      weeklyXP: parseInt(r.weeklyXP) || 0,
      gamesPlayed: parseInt(r.gamesPlayed) || 0,
    }));
  }
}