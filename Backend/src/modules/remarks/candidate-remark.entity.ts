import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tutor_candidate_remarks')
export class CandidateRemark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'text' })
  remarkText: string;

  @Column({ default: 'beginner' })
  currentStage: string;

  @Column({ default: 50 })
  grammarLevel: number;

  @Column({ default: 50 })
  speakingLevel: number;

  @Column({ default: 50 })
  writingLevel: number;

  @Column({ default: 50 })
  consistencyScore: number;

  @Column({ type: 'text', nullable: true })
  strengths: string;

  @Column({ type: 'text', nullable: true })
  weaknesses: string;

  @Column({ type: 'text', nullable: true })
  focusAreas: string;

  @Column({ type: 'text', nullable: true })
  comparisonWithPrevious: string;

  @Column({ type: 'date' })
  remarkDate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}