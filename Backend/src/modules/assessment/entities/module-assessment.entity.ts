import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type AssessmentStatus = 'completed' | 'incomplete' | 'in_progress';

@Entity('module_assessments')
@Index(['userId', 'moduleId'])
@Index(['userId', 'lessonId'])
export class ModuleAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string;

  /** e.g. 'sp-1', 'wr-2', 'as-1' */
  @Column({ name: 'module_id', type: 'varchar', length: 30 })
  moduleId: string;

  /** e.g. 'sp-1-1' */
  @Column({ name: 'lesson_id', type: 'varchar', length: 30, nullable: true })
  lessonId: string;

  /** BEGINNER | INTERMEDIATE | ADVANCED */
  @Column({ type: 'varchar', length: 20, nullable: true })
  level: string;

  /** SET_1 … SET_10 */
  @Column({ type: 'varchar', length: 20, nullable: true })
  set: string;

  /** Part A score (MCQ %) */
  @Column({ name: 'part_a_score', type: 'float', nullable: true })
  partAScore: number;

  /** Part B score (open / speaking %) */
  @Column({ name: 'part_b_score', type: 'float', nullable: true })
  partBScore: number;

  /** Computed average of partA + partB */
  @Column({ name: 'overall_score', type: 'float', nullable: true })
  overallScore: number;

  /**
   * Full JSON response for each question:
   * {
   *   partA: { score: 80, questions: [{ questionNumber, question, userAnswer, correctAnswer, isCorrect, marks }] },
   *   partB: { score: 72, questions: [{ questionNumber, question, transcript, feedback, scores }] }
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  responses: any;

  /** completed | incomplete | in_progress */
  @Column({ type: 'varchar', length: 20, default: 'completed' })
  status: AssessmentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
