import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('assessment_attempts', { synchronize: false })
export class AssessmentAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'module_id', type: 'varchar', nullable: true })
  moduleId: string;

  @Column({ type: 'varchar', nullable: true })
  category: string; // e.g. 'writing'

  @Column({ type: 'varchar', nullable: true })
  level: string;

  @Column({ type: 'float', default: 0 })
  score: number;

  @Column({ type: 'float', nullable: true })
  overallScore: number;

  @Column({ type: 'boolean', nullable: true })
  passed: boolean;

  @Column({ type: 'jsonb', nullable: true })
  responses: any;

  @Column({ type: 'jsonb', nullable: true })
  answers: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
