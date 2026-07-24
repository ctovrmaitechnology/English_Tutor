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

    const isTwoPartLesson = (
      data.moduleId?.startsWith('sp-') ||
      lId?.startsWith('sp-') ||
      data.moduleId?.startsWith('wr-') ||
      lId?.startsWith('wr-')
    );

    // Check if an existing attempt exists for this user, lesson, and set (incomplete or completed)
    const existingAttempt = await this.attemptRepo.findOne({
      where: [
        { userId: data.userId, lessonId: lId, set: setUsed },
        { userId: data.userId, moduleId: lId, set: setUsed },
        { userId: data.userId, lessonId: lId },
        { userId: data.userId, moduleId: lId },
      ],
      order: { createdAt: 'DESC' },
    });

    const mergedResponses = {
      ...(existingAttempt?.responses || {}),
      ...(data.responses || {}),
    };

    const hasPartA = !!(
      mergedResponses?.partA &&
      (Array.isArray(mergedResponses.partA.questions)
        ? mergedResponses.partA.questions.length > 0
        : mergedResponses.partA.score !== undefined)
    );

    const hasPartB = !!(
      mergedResponses?.partB &&
      (Array.isArray(mergedResponses.partB.questions)
        ? mergedResponses.partB.questions.length > 0
        : (mergedResponses.partB.score !== undefined || data.partBScore !== undefined))
    );

    let attemptStatus: 'completed' | 'incomplete' = 'completed';
    if (isTwoPartLesson && (!hasPartA || !hasPartB)) {
      attemptStatus = 'incomplete';
    }

    const pA = data.partAScore ?? mergedResponses?.partA?.score ?? mergedResponses?.partA?.overallScore;
    const pB = data.partBScore ?? mergedResponses?.partB?.score ?? mergedResponses?.partB?.overallScore;

    let overallScore: number;
    if (hasPartA && hasPartB) {
      const scoreA = pA !== undefined ? pA : 0;
      const scoreB = pB !== undefined ? pB : 0;
      overallScore = Math.round((scoreA + scoreB) / 2);
    } else if (hasPartA) {
      overallScore = Math.round(pA !== undefined ? pA : (data.score ?? 0));
    } else if (hasPartB) {
      overallScore = Math.round(pB !== undefined ? pB : (data.score ?? 0));
    } else {
      overallScore = Math.round(data.score ?? 0);
    }

    if (existingAttempt) {
      existingAttempt.overallScore = overallScore;
      existingAttempt.responses = mergedResponses;
      existingAttempt.status = attemptStatus;
      if (data.set) existingAttempt.set = data.set;
      if (data.username) existingAttempt.username = data.username;

      return this.attemptRepo.save(existingAttempt);
    }

    const attempt = this.attemptRepo.create({
      userId: data.userId,
      username: data.username,
      moduleId: data.moduleId,
      lessonId: lId,
      level: data.level || 'BEGINNER',
      set: setUsed,
      overallScore,
      responses: mergedResponses,
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
    return this.getCompletedLessonIds(userId);
  }

  async getCompletedLessonIds(userId: string): Promise<string[]> {
    const attempts = await this.attemptRepo.find({
      where: { userId, status: 'completed' },
      select: ['lessonId', 'moduleId', 'responses'],
    });

    const validIds = attempts
      .filter(a => {
        const id = a.lessonId || a.moduleId;
        const isTwoPart = id?.startsWith('sp-') || id?.startsWith('wr-');
        if (isTwoPart) {
          const hasPartA = !!(
            a.responses?.partA &&
            (Array.isArray(a.responses.partA.questions)
              ? a.responses.partA.questions.length > 0
              : a.responses.partA.score !== undefined)
          );
          const hasPartB = !!(
            a.responses?.partB &&
            (Array.isArray(a.responses.partB.questions)
              ? a.responses.partB.questions.length > 0
              : (a.responses.partB.score !== undefined || a.responses.partB.overallScore !== undefined))
          );
          return hasPartA && hasPartB;
        }
        return true;
      })
      .map(a => a.lessonId || a.moduleId)
      .filter(Boolean);

    return [...new Set(validIds)];
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
