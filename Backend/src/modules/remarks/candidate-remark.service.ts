import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CandidateRemark } from './candidate-remark.entity';
import { GeminiService } from '../gemini/gemini.service';
import { User } from '../users/user.entity';
import { ModuleProgress } from '../assessment/entities/module-progress.entity';
import { AssessmentAttempt } from '../assessment/entities/assessment-attempt.entity';
import { GameSession } from '../games/entities/game-session.entity';

@Injectable()
export class CandidateRemarkService {
  private readonly logger = new Logger(CandidateRemarkService.name);

  constructor(
    @InjectRepository(CandidateRemark)
    private readonly remarkRepo: Repository<CandidateRemark>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(ModuleProgress)
    private readonly moduleProgressRepo: Repository<ModuleProgress>,

    @InjectRepository(AssessmentAttempt)
    private readonly attemptRepo: Repository<AssessmentAttempt>,

    @InjectRepository(GameSession)
    private readonly gameRepo: Repository<GameSession>,

    private readonly gemini: GeminiService,
  ) {}

  // ── Get current remark for a user ─────────────────────────────
  async getUserRemark(userId: string): Promise<CandidateRemark | null> {
    return this.remarkRepo.findOne({
      where: { userId },
      order: { remarkDate: 'DESC' },
    });
  }

  // ── Get remark as system prompt context ──────────────────────
  async getRemarkAsContext(userId: string): Promise<string> {
    const remark = await this.getUserRemark(userId);
    if (!remark) return '';

    return `
[CANDIDATE LEARNING PROFILE — use this to personalize your responses]
Current Stage: ${remark.currentStage}
Grammar Level: ${remark.grammarLevel}/100
Speaking Level: ${remark.speakingLevel}/100
Writing Level: ${remark.writingLevel}/100
Consistency Score: ${remark.consistencyScore}/100
Strengths: ${remark.strengths || 'still being assessed'}
Weaknesses: ${remark.weaknesses || 'still being assessed'}
Focus Areas: ${remark.focusAreas || 'general English improvement'}
Progress vs Yesterday: ${remark.comparisonWithPrevious || 'first day of tracking'}
Today's Remark: ${remark.remarkText}

INSTRUCTIONS: Based on this profile, adapt your responses to this specific candidate's level. 
If they are weak in grammar, gently correct and practice grammar. 
If they are strong in speaking, challenge them with complex topics.
If consistency is low, motivate them to practice daily.
Always match vocabulary complexity to their current stage.
`.trim();
  }

  // ── Build daily snapshot for a user ──────────────────────────
  private async buildUserSnapshot(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [
      allAttempts,
      todayModules,
      totalModules,
      gameStats,
      streak,
    ] = await Promise.all([
      this.attemptRepo.find({ where: { userId }, order: { createdAt: 'ASC' } }),
      this.moduleProgressRepo.count({ where: { userId, completed: true, completedAt: MoreThanOrEqual(today) } }),
      this.moduleProgressRepo.count({ where: { userId, completed: true } }),
      this.gameRepo.createQueryBuilder('g')
        .select('COUNT(*)', 'total')
        .addSelect('COALESCE(AVG(CASE WHEN g.completed = true THEN g.accuracy END), 0)', 'avgAcc')
        .addSelect('COALESCE(SUM(g."xpEarned"), 0)', 'xp')
        .where('g."userId" = :uid', { uid: userId })
        .getRawOne(),
      this.computeStreak(userId),
    ]);

    const latestAttempt = allAttempts[allAttempts.length - 1];
    const firstAttempt  = allAttempts[0];
    const latestScore   = latestAttempt ? Math.round((latestAttempt.score / 30) * 100) : 0;
    const entryScore    = firstAttempt  ? Math.round((firstAttempt.score / 30) * 100)  : 0;

    const speakingAttempts = allAttempts.filter(a => a.category === 'speaking');
    const writingAttempts  = allAttempts.filter(a => a.category === 'writing');
    const latestSpk = speakingAttempts[speakingAttempts.length - 1];
    const latestWrt = writingAttempts[writingAttempts.length - 1];

    return {
      userId,
      entryScore,
      latestScore,
      speakingScore:    latestSpk ? Math.round((latestSpk.score / 30) * 100) : 0,
      writingScore:     latestWrt ? Math.round((latestWrt.score / 30) * 100) : 0,
      modulesToday:     todayModules,
      modulesTotal:     totalModules,
      gamesPlayed:      Number(gameStats?.total) || 0,
      avgGameAccuracy:  Math.round(Number(gameStats?.avgAcc) || 0),
      totalXp:          Math.round(Number(gameStats?.xp) || 0),
      streak,
      improvement:      latestScore - entryScore,
    };
  }

  private async computeStreak(userId: string): Promise<number> {
    const sessions = await this.gameRepo
      .createQueryBuilder('g')
      .select('DATE(g."startedAt")', 'day')
      .where('g."userId" = :uid', { uid: userId })
      .groupBy('DATE(g."startedAt")')
      .orderBy('day', 'DESC')
      .getRawMany();

    if (!sessions.length) return 0;
    let streak = 0;
    let current = new Date(); current.setHours(0, 0, 0, 0);
    for (const s of sessions) {
      const day = new Date(s.day); day.setHours(0, 0, 0, 0);
      const diff = Math.round((current.getTime() - day.getTime()) / 86400000);
      if (diff <= 1) { streak++; current = day; } else break;
    }
    return streak;
  }

  // ── Generate remark for a single user ────────────────────────
  async generateRemarkForUser(userId: string): Promise<CandidateRemark | null> {
    try {
      const snapshot    = await this.buildUserSnapshot(userId);
      const prevRemark  = await this.getUserRemark(userId);
      const today       = new Date().toISOString().split('T')[0];

      // Determine stage
      let currentStage = 'beginner';
      if (snapshot.latestScore >= 75 && snapshot.modulesTotal >= 6) currentStage = 'advanced';
      else if (snapshot.latestScore >= 50 || snapshot.modulesTotal >= 3) currentStage = 'intermediate';

      const prevContext = prevRemark ? `
Previous day's remark (${prevRemark.remarkDate}):
- Stage: ${prevRemark.currentStage}
- Grammar: ${prevRemark.grammarLevel}/100
- Speaking: ${prevRemark.speakingLevel}/100
- Writing: ${prevRemark.writingLevel}/100
- Consistency: ${prevRemark.consistencyScore}/100
- Summary: ${prevRemark.remarkText}
` : 'This is the first remark for this candidate.';

      const prompt = `You are an expert BPO English training coach. Generate a comprehensive daily learning remark for this candidate.

CANDIDATE DATA TODAY:
- Entry Test Score: ${snapshot.entryScore}%
- Latest Assessment Score: ${snapshot.latestScore}%
- Speaking Score: ${snapshot.speakingScore}%
- Writing Score: ${snapshot.writingScore}%
- Modules Completed Today: ${snapshot.modulesToday}
- Total Modules Completed: ${snapshot.modulesTotal}/8
- Games Played (total): ${snapshot.gamesPlayed}
- Average Game Accuracy: ${snapshot.avgGameAccuracy}%
- Current Streak: ${snapshot.streak} days
- Total XP: ${snapshot.totalXp}
- Score Improvement from Entry: ${snapshot.improvement > 0 ? '+' : ''}${snapshot.improvement}%
- Current Stage: ${currentStage}

${prevContext}

Generate a JSON response with EXACTLY this structure (no markdown, pure JSON):
{
  "remarkText": "2-3 sentence comprehensive daily remark comparing today vs yesterday, current strengths and weaknesses, what stage they are at, what needs improvement. Be specific, encouraging but honest.",
  "grammarLevel": <number 0-100>,
  "speakingLevel": <number 0-100>,
  "writingLevel": <number 0-100>,
  "consistencyScore": <number 0-100 based on streak and daily activity>,
  "strengths": "comma-separated list of 2-3 specific strengths",
  "weaknesses": "comma-separated list of 2-3 specific weaknesses",
  "focusAreas": "comma-separated list of 2-3 things the AI tutor should focus on with this candidate",
  "comparisonWithPrevious": "1 sentence comparing today vs yesterday's performance"
}`;

      const raw = await this.gemini.generate(prompt);
      let parsed: any;
      try {
        const clean = raw.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        // If JSON parse fails, build a fallback remark
        parsed = {
          remarkText: `Candidate is at ${currentStage} level with ${snapshot.latestScore}% on latest assessment. ${snapshot.modulesTotal} modules completed so far. ${snapshot.streak > 0 ? `Active streak of ${snapshot.streak} days shows good consistency.` : 'Needs to improve daily practice consistency.'}`,
          grammarLevel: Math.max(20, snapshot.writingScore),
          speakingLevel: Math.max(20, snapshot.speakingScore),
          writingLevel: Math.max(20, snapshot.writingScore),
          consistencyScore: Math.min(100, snapshot.streak * 10 + 20),
          strengths: snapshot.latestScore >= 70 ? 'Assessment performance, module completion' : 'Participation, effort',
          weaknesses: snapshot.latestScore < 70 ? 'Assessment scores, needs more practice' : 'Consistency, daily habits',
          focusAreas: 'grammar practice, speaking confidence, vocabulary building',
          comparisonWithPrevious: prevRemark ? `Score changed from ${prevRemark.grammarLevel}/100 to ${snapshot.latestScore}/100.` : 'First day of tracking.',
        };
      }

      // Upsert — overwrite existing remark for this user
      let remark = await this.remarkRepo.findOne({ where: { userId } });
      if (!remark) {
        remark = this.remarkRepo.create({ userId });
      }

      remark.remarkDate            = today;
      remark.remarkText            = parsed.remarkText || '';
      remark.currentStage          = currentStage;
      remark.grammarLevel          = Math.min(100, Math.max(0, Number(parsed.grammarLevel) || 50));
      remark.speakingLevel         = Math.min(100, Math.max(0, Number(parsed.speakingLevel) || 50));
      remark.writingLevel          = Math.min(100, Math.max(0, Number(parsed.writingLevel) || 50));
      remark.consistencyScore      = Math.min(100, Math.max(0, Number(parsed.consistencyScore) || 50));
      remark.strengths             = parsed.strengths || '';
      remark.weaknesses            = parsed.weaknesses || '';
      remark.focusAreas            = parsed.focusAreas || '';
      remark.comparisonWithPrevious= parsed.comparisonWithPrevious || '';

      await this.remarkRepo.save(remark);
      this.logger.log(`Remark generated for user ${userId} — stage: ${currentStage}, score: ${snapshot.latestScore}%`);
      return remark;
    } catch (err: any) {
      this.logger.error(`Failed to generate remark for user ${userId}: ${err?.message}`);
      return null;
    }
  }

  // ── Scheduler: 2 AM IST = 20:30 UTC ──────────────────────────
  @Cron('30 20 * * *', { timeZone: 'UTC' })
  async scheduledRemarkGeneration() {
    this.logger.log('Starting scheduled daily remark generation (2 AM IST)...');
    const users = await this.userRepo.find({
      where: { is_active: true, deleted_at: null },
      select: ['id', 'first_name', 'last_name'],
    });

    this.logger.log(`Generating remarks for ${users.length} active users...`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      await this.generateRemarkForUser(user.id);
      // Delay between users to avoid Gemini RPM limits
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay between each user
      }
    }

    this.logger.log('Daily remark generation complete.');
  }
}