import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { QuestionSet } from './question-bank.entity';

export type AttemptStatus = 'in_progress' | 'completed' | 'expired';
export type PlacementLevel = 'BEGINNER' | 'ELEMENTARY' | 'INTERMEDIATE' | 'ADVANCED';

@Entity('placement_attempts')
@Index(['userId', 'status'])
export class PlacementAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 26 })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** 1 for first attempt, 2 for retake, etc. Used to exclude prior questions. */
  @Column({ type: 'smallint', default: 1 })
  attemptNumber!: number;

  @Column({ type: 'varchar', length: 20, default: 'in_progress' })
  status!: AttemptStatus;

  /** How many questions this attempt is configured to ask (e.g. 20). */
  @Column({ type: 'smallint', nullable: true })
  totalQuestions!: number;

  @Column({ type: 'smallint', default: 0 })
  currentQuestionIndex!: number; // 0-based pointer into the attempt's question sequence

  /** Running difficulty pointer (retained for entity schema compatibility). */
  @Column({ type: 'smallint', default: 5 })
  currentDifficulty!: number;

  /** Assigned fixed question set: 'A', 'B', or 'C' */
  @Column({ type: 'varchar', length: 20, nullable: true })
  assignedSet!: QuestionSet;

  @Column({ type: 'smallint', nullable: true })
  totalScore!: number; // out of 100, set on completion

  @Column({ type: 'jsonb', nullable: true })
  skillScores!: {
    grammar?: number;
    vocabulary?: number;
    reading?: number;
    listening?: number;
  };

  @Column({ type: 'varchar', length: 20, nullable: true })
  finalLevel!: PlacementLevel;

  @Column({ type: 'smallint', nullable: true })
  confidenceScore!: number; // 0-100, how "sure" the placement is

  @CreateDateColumn()
  startedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
