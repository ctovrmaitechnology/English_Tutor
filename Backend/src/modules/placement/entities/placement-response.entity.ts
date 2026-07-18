import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { PlacementAttempt } from './placement-attempt.entity';
import { PlacementQuestion } from './placement-question.entity';

/**
 * One row per answered question. Written immediately as the user answers
 * (not batched at the end) — this is the resume-on-refresh safety net and
 * the source of truth for "which questions has this user already seen".
 */
@Entity('placement_responses')
@Unique(['attemptId', 'questionId']) // a question can't be answered twice in one attempt
@Index(['attemptId'])
export class PlacementResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => PlacementAttempt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt: PlacementAttempt;

  @Column({ type: 'uuid' })
  questionId: string;

  @ManyToOne(() => PlacementQuestion, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'questionId' })
  question: PlacementQuestion;

  @Column({ type: 'smallint' })
  questionOrder: number; // position in this attempt's sequence (0-based)

  /** Only populated when the question is questionType='mcq'. */
  @Column({ type: 'smallint', nullable: true })
  selectedOptionIndex: number | null;

  /**
   * Free-text (or transcribed-audio) response, for question types that
   * aren't multiple choice (fill_blank, spoken_dialogue, free_text, etc.).
   * Stored as-is; scoring for these types is not implemented yet.
   */
  @Column({ type: 'text', nullable: true })
  textResponse: string | null;

  /**
   * Whether this response has been scored. MCQ responses are scored
   * immediately (isCorrect is set). Non-MCQ responses are recorded with
   * isScored=false and isCorrect=null until a scoring pipeline for that
   * question type exists (manual review or AI grading) — see
   * PlacementService for the current scoring boundary.
   */
  @Column({ type: 'boolean', default: true })
  isScored: boolean;

  @Column({ type: 'boolean', nullable: true })
  isCorrect: boolean | null;

  /** Difficulty the question was served at — needed later for IRT/analytics. */
  @Column({ type: 'smallint' })
  difficultyAtTime: number;

  @Column({ type: 'varchar', length: 20 })
  skill: string;

  @Column({ type: 'int', nullable: true })
  responseTimeMs: number;

  @CreateDateColumn()
  answeredAt: Date;
}
