import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttemptLesson } from './entities/attempt-lesson.entity';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(AttemptLesson)
    private readonly attemptRepo: Repository<AttemptLesson>,
  ) { }

  async saveAttempt(data: {
    userId: string;
    username?: string;
    moduleId: string;
    lessonId?: string;
    level?: string;
    set?: string;
    partAScore?: number;
    partBScore?: number;
    score?: number;
    status?: 'completed' | 'incomplete';
    responses?: any;
  }) {
    const lId = data.lessonId || data.moduleId;
    const setUsed = data.set || 'SET_1';

    let attemptStatus = data.status || 'completed';
    const isTwoPartLesson = (data.moduleId?.startsWith('sp-') || lId?.startsWith('sp-'));
    const hasPartB = !!(data.responses?.partB && Array.isArray(data.responses.partB.questions) && data.responses.partB.questions.length > 0);

    // Strict rule: Speaking lessons without Part B completed must stay 'incomplete'
    if (isTwoPartLesson && !hasPartB) {
      attemptStatus = 'incomplete';
    }

    const pA = data.partAScore ?? data.responses?.partA?.score ?? data.score ?? 0;
    const pB = data.partBScore ?? data.responses?.partB?.score ?? data.score ?? 0;
    
    let overallScore = data.score;
    if (overallScore === undefined || overallScore === null) {
      if (data.partAScore !== undefined && data.partBScore !== undefined) {
        overallScore = (data.partAScore + data.partBScore) / 2;
      } else if (data.partAScore !== undefined) {
        overallScore = data.partAScore;
      } else if (data.partBScore !== undefined) {
        overallScore = data.partBScore;
      } else {
        overallScore = 100;
      }
    }

    // Check if an incomplete attempt exists for this user, lesson, and set
    const existingIncomplete = await this.attemptRepo.findOne({
      where: [
        { userId: data.userId, lessonId: lId, set: setUsed, status: 'incomplete' },
        { userId: data.userId, moduleId: lId, set: setUsed, status: 'incomplete' },
        { userId: data.userId, lessonId: lId, status: 'incomplete' },
        { userId: data.userId, moduleId: lId, status: 'incomplete' },
      ],
      order: { createdAt: 'DESC' },
    });

    if (existingIncomplete) {
      const mergedResponses = {
        ...(existingIncomplete.responses || {}),
        ...(data.responses || {}),
      };
      existingIncomplete.overallScore = overallScore;
      existingIncomplete.responses = mergedResponses;
      existingIncomplete.status = attemptStatus;
      if (data.set) existingIncomplete.set = data.set;
      if (data.username) existingIncomplete.username = data.username;

      return this.attemptRepo.save(existingIncomplete);
    }

    const attempt = this.attemptRepo.create({
      userId: data.userId,
      username: data.username,
      moduleId: data.moduleId,
      lessonId: lId,
      level: data.level || 'BEGINNER',
      set: setUsed,
      overallScore,
      responses: data.responses || {},
      status: attemptStatus,
    });

    return this.attemptRepo.save(attempt);
  }

  async getIncompleteAttempt(userId: string, lessonId: string): Promise<AttemptLesson | null> {
    return this.attemptRepo.findOne({
      where: [
        { userId, lessonId, status: 'incomplete' },
        { userId, moduleId: lessonId, status: 'incomplete' },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async getCompletedLessons(userId: string): Promise<string[]> {
    const attempts = await this.attemptRepo.find({
      where: { userId, status: 'completed' },
      select: ['lessonId', 'moduleId'],
    });
    const ids = attempts.map(a => a.lessonId || a.moduleId).filter(Boolean);
    return [...new Set(ids)];
  }

  async getCompletedLessonIds(userId: string): Promise<string[]> {
    const attempts = await this.attemptRepo.find({
      where: { userId, status: 'completed' },
      select: ['lessonId', 'moduleId'],
    });
    const ids = attempts.map(a => a.lessonId || a.moduleId).filter(Boolean);
    return [...new Set(ids)];
  }

  async getAttempts(userId: string) {
    return this.attemptRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAttemptsByLesson(userId: string, lessonId: string) {
    return this.attemptRepo.find({
      where: [
        { userId, lessonId },
        { userId, moduleId: lessonId },
      ],
      order: { createdAt: 'DESC' },
    });
  }
}
