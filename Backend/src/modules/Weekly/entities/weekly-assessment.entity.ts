import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('weekly_assessments')
export class WeeklyAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  username: string;

  @Column({ name: 'modules_covered', type: 'simple-array', nullable: true })
  modulesCovered: string[];

  @Column({ name: 'lessons_covered', type: 'simple-array', nullable: true })
  lessonsCovered: string[];

  @Column({ type: 'float', default: 0 })
  score: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
