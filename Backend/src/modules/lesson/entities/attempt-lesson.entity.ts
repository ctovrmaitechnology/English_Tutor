import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type AttemptStatus = 'completed' | 'incomplete';

@Entity('attempt_lessons')
@Index(['userId', 'moduleId']) // Fast retrieval by user and module
export class AttemptLesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  username: string;

  // Aligning with lesson identifiers
  @Column({ name: 'module_id', type: 'varchar', length: 20 })
  moduleId: string; // e.g. 'sp-1-1' or 'wr-1-1'

  @Column({ name: 'lesson_id', type: 'varchar', length: 20, nullable: true })
  lessonId: string; // e.g. '1'

  @Column({ type: 'varchar', length: 20, nullable: true })
  level: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  set: string;

  @Column({ name: 'overall_score', type: 'float', nullable: true })
  overallScore: number;

  @Column({ type: 'jsonb', nullable: true })
  responses: any;

  @Column({ type: 'varchar', length: 20, default: 'completed' })
  status: AttemptStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
