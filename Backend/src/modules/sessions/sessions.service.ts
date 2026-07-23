import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { UserSession } from './user-session.entity';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
  ) {}

  // Called when user logs in
  async startSession(userId: string): Promise<UserSession> {
    // End any existing active sessions for this user first
    await this.endStaleSessions(userId);

    const session = this.sessionRepo.create({
      userId,
      startedAt: new Date(),
      status: 'active',
      duration: 0,
      aiTutorDuration: 0,
    });
    return this.sessionRepo.save(session);
  }

  // Called when user logs out or closes tab
  async endSession(userId: string, aiTutorDuration = 0): Promise<void> {
    const activeSession = await this.sessionRepo.findOne({
      where: { userId, status: 'active' },
      order: { startedAt: 'DESC' },
    });

    if (!activeSession) return;

    const endedAt = new Date();
    const duration = Math.floor(
      (endedAt.getTime() - activeSession.startedAt.getTime()) / 1000,
    );

    await this.sessionRepo.update(activeSession.id, {
      endedAt,
      duration: Math.max(0, duration),
      aiTutorDuration: Math.max(0, aiTutorDuration),
      status: 'ended',
    });

    this.logger.log(
      `Session ended: user=${userId} duration=${Math.round(duration / 60)}min aiTutor=${Math.round(aiTutorDuration / 60)}min`,
    );
  }

  // Update AI tutor time mid-session (called periodically from frontend)
  async updateAiTutorTime(userId: string, aiTutorDuration: number): Promise<void> {
    const activeSession = await this.sessionRepo.findOne({
      where: { userId, status: 'active' },
      order: { startedAt: 'DESC' },
    });
    if (!activeSession) return;
    await this.sessionRepo.update(activeSession.id, { aiTutorDuration });
  }

  // Get total usage stats for a user
  async getUserStats(userId: string): Promise<{
    totalUsageSeconds: number;
    totalAiTutorSeconds: number;
    sessionCount: number;
    avgSessionSeconds: number;
  }> {
    const result = await this.sessionRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.duration), 0)', 'totalDuration')
      .addSelect('COALESCE(SUM(s."aiTutorDuration"), 0)', 'totalAiTutor')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(AVG(s.duration), 0)', 'avgDuration')
      .where('s."userId" = :uid AND s.status = :status', { uid: userId, status: 'ended' })
      .getRawOne();

    return {
      totalUsageSeconds:  Math.round(Number(result?.totalDuration) || 0),
      totalAiTutorSeconds: Math.round(Number(result?.totalAiTutor) || 0),
      sessionCount:        Number(result?.count) || 0,
      avgSessionSeconds:   Math.round(Number(result?.avgDuration) || 0),
    };
  }

  // Get stats for ALL users in one query (for admin dashboard)
  async getAllUserStats(): Promise<Record<string, {
    totalUsageMins: number;
    totalAiTutorMins: number;
    sessionCount: number;
    avgSessionMins: number;
  }>> {
    const rows = await this.sessionRepo
      .createQueryBuilder('s')
      .select('s."userId"', 'userId')
      .addSelect('COALESCE(SUM(s.duration), 0)', 'totalDuration')
      .addSelect('COALESCE(SUM(s."aiTutorDuration"), 0)', 'totalAiTutor')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(AVG(s.duration), 0)', 'avgDuration')
      .where('s.status = :status', { status: 'ended' })
      .groupBy('s."userId"')
      .getRawMany();

    const map: Record<string, any> = {};
    for (const r of rows) {
      map[r.userId] = {
        totalUsageMins:   Math.round(Number(r.totalDuration) / 60),
        totalAiTutorMins: Math.round(Number(r.totalAiTutor) / 60),
        sessionCount:     Number(r.count),
        avgSessionMins:   Math.round(Number(r.avgDuration) / 60),
      };
    }
    return map;
  }

  // End stale active sessions (safety cleanup)
  private async endStaleSessions(userId: string): Promise<void> {
    const stale = await this.sessionRepo.find({
      where: { userId, status: 'active' },
    });
    for (const s of stale) {
      const duration = Math.floor((Date.now() - s.startedAt.getTime()) / 1000);
      await this.sessionRepo.update(s.id, {
        endedAt: new Date(),
        duration: Math.max(0, duration),
        status: 'ended',
      });
    }
  }

  // Cron: End sessions that have been active for more than 8 hours (tab left open)
  @Cron('0 * * * *') // every hour
  async cleanupLongSessions(): Promise<void> {
    const eightHoursAgo = new Date(Date.now() - 8 * 3600 * 1000);
    const stale = await this.sessionRepo.find({
      where: { status: 'active', startedAt: MoreThanOrEqual(new Date(0)) },
    });
    for (const s of stale) {
      if (s.startedAt < eightHoursAgo) {
        const duration = Math.min(8 * 3600, Math.floor((Date.now() - s.startedAt.getTime()) / 1000));
        await this.sessionRepo.update(s.id, {
          endedAt: new Date(),
          duration,
          status: 'ended',
        });
      }
    }
  }
}