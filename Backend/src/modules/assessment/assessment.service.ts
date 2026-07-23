import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleQuestion } from './entities/module-question.entity';
import { ModuleAssessment } from './entities/module-assessment.entity';

@Injectable()
export class AssessmentService {
  constructor(
    @InjectRepository(ModuleQuestion)
    private readonly questionRepo: Repository<ModuleQuestion>,
    @InjectRepository(ModuleAssessment)
    private readonly assessmentRepo: Repository<ModuleAssessment>,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // QUESTIONS
  // ─────────────────────────────────────────────────────────────────

  /** Bulk-upload questions (used by admin seeder endpoint) */
  async uploadQuestions(questions: Partial<ModuleQuestion>[]) {
    if (!questions || questions.length === 0) {
      throw new BadRequestException('No questions provided');
    }
    const entities = questions.map((q) => this.questionRepo.create(q));
    return this.questionRepo.save(entities);
  }

  /** Get all questions for a module/lesson, split by part */
  async getQuestionsForLesson(moduleId: string, userId: string, excludeSet?: string) {
    // 1. Distinct sets for this module
    const sets = await this.questionRepo
      .createQueryBuilder('q')
      .select('DISTINCT q.set', 'set')
      .where('q.moduleId = :moduleId', { moduleId })
      .getRawMany<{ set: string }>();

    if (!sets.length) {
      throw new NotFoundException(`No questions found for module: ${moduleId}`);
    }

    const availableSets = sets.map((s) => s.set);

    // 2. Find sets already used by this user
    const pastAttempts = await this.assessmentRepo.find({
      where: { userId, moduleId },
      select: ['set'],
    });
    const usedSets = new Set(pastAttempts.map((a) => a.set));
    if (excludeSet) usedSets.add(excludeSet);

    let candidateSets = availableSets.filter((s) => !usedSets.has(s));
    if (!candidateSets.length) {
      candidateSets = excludeSet
        ? availableSets.filter((s) => s !== excludeSet)
        : availableSets;
    }
    if (!candidateSets.length) candidateSets = availableSets;

    const chosenSet = candidateSets[Math.floor(Math.random() * candidateSets.length)];

    const questions = await this.questionRepo.find({
      where: { moduleId, set: chosenSet },
      order: { questionNumber: 'ASC' },
    });

    return {
      set_used: chosenSet,
      partA: questions.filter((q) => q.part === 'PART_A'),
      partB: questions.filter((q) => q.part === 'PART_B'),
    };
  }

  /** Delete all questions for a module (admin use) */
  async deleteQuestionsForModule(moduleId: string) {
    await this.questionRepo.delete({ moduleId });
    return { message: `Deleted all questions for ${moduleId}` };
  }

  // ─────────────────────────────────────────────────────────────────
  // ATTEMPTS / ASSESSMENTS
  // ─────────────────────────────────────────────────────────────────

  async saveAssessment(data: {
    userId: string;
    username: string;
    moduleId: string;
    lessonId: string;
    level: string;
    set: string;
    partAScore: number;
    partBScore?: number;
    responses: any;
    status?: 'completed' | 'incomplete' | 'in_progress';
  }) {
    const partBScore = data.partBScore ?? 0;
    const hasBoth = data.partAScore !== undefined && data.partBScore !== undefined;
    const overallScore = hasBoth
      ? Math.round((data.partAScore + partBScore) / 2)
      : data.partAScore ?? partBScore;

    const attempt = this.assessmentRepo.create({
      userId: data.userId,
      username: data.username,
      moduleId: data.moduleId,
      lessonId: data.lessonId,
      level: data.level,
      set: data.set,
      partAScore: data.partAScore,
      partBScore: partBScore,
      overallScore,
      responses: data.responses,
      status: data.status ?? 'completed',
    });

    return this.assessmentRepo.save(attempt);
  }

  async getAssessmentsByUser(userId: string) {
    return this.assessmentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAssessmentsByLesson(userId: string, lessonId: string) {
    return this.assessmentRepo.find({
      where: [
        { userId, lessonId },
        { userId, moduleId: lessonId },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async getCompletedLessons(userId: string) {
    const attempts = await this.assessmentRepo.find({
      where: { userId, status: 'completed' },
      select: ['lessonId', 'moduleId'],
    });
    const ids = attempts.map((a) => a.lessonId || a.moduleId).filter(Boolean);
    return [...new Set(ids)];
  }

  // Admin: get all assessments for a user (admin panel)
  async getAssessmentsByUserAdmin(userId: string) {
    return this.assessmentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
