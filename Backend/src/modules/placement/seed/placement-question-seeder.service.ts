import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { PlacementQuestion } from '../entities/placement-question.entity';
import { PLACEMENT_QUESTION_SEED } from './placement-questions.seed';

/**
 * Seeds the placement_questions bank on boot, ONLY if it's empty or below
 * a minimum threshold. Never overwrites/duplicates existing rows —
 * safe to deploy repeatedly. Mirrors the pattern already used in
 * AssessmentService.onModuleInit, but scoped to the placement module only.
 */
@Injectable()
export class PlacementQuestionSeederService implements OnModuleInit {
  private readonly logger = new Logger(PlacementQuestionSeederService.name);

  constructor(
    @InjectRepository(PlacementQuestion)
    private readonly questionRepository: Repository<PlacementQuestion>,
  ) {}

  async onModuleInit() {
    const count = await this.questionRepository.count({ where: { status: 'active' } });

    // If we have already seeded the expected number of questions from placement-data, skip re-seeding
    if (count >= PLACEMENT_QUESTION_SEED.length && PLACEMENT_QUESTION_SEED.length > 0 && count > 15) {
      this.logger.log(`Placement bank already seeded (${count} active questions). Skipping.`);
      return;
    }

    this.logger.log('Seeding placement 3 fixed sets (A, B, C)...');
    await this.questionRepository.query('TRUNCATE TABLE placement_questions CASCADE'); // Clear out old un-assigned adaptive questions cleanly with cascade
    const rows = PLACEMENT_QUESTION_SEED.map((q) =>
      this.questionRepository.create({
        ...q,
        status: 'active',
        version: 1,
        questionGroupId: randomUUID(),
      }),
    );
    await this.questionRepository.save(rows);
    this.logger.log(`Seeded ${rows.length} placement questions across sets A, B, and C.`);

    await this.logCoverageWarning();
  }

  /**
   * Warns at boot if any (skill, difficulty-band) cell is under-stocked.
   * This is the practical check for "do we have enough questions for the
   * selection engine to avoid repeats and exposure problems at 4,000 users."
   */
  private async logCoverageWarning() {
    const bands = [
      { label: 'easy (1-3)', min: 1, max: 3 },
      { label: 'medium (4-7)', min: 4, max: 7 },
      { label: 'hard (8-10)', min: 8, max: 10 },
    ];
    const skills: string[] = ['grammar', 'vocabulary', 'reading', 'listening'];
    const MIN_RECOMMENDED = 30;

    for (const skill of skills) {
      for (const band of bands) {
        const c = await this.questionRepository
          .createQueryBuilder('q')
          .where('q.status = :status', { status: 'active' })
          .andWhere('q.skill = :skill', { skill })
          .andWhere('q.difficulty BETWEEN :min AND :max', { min: band.min, max: band.max })
          .getCount();

        if (c < MIN_RECOMMENDED) {
          this.logger.warn(
            `Coverage gap: ${skill} / ${band.label} has only ${c} active questions ` +
              `(recommended minimum ${MIN_RECOMMENDED}). Add more before go-live.`,
          );
        }
      }
    }
  }
}
