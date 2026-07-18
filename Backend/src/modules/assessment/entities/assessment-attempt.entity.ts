import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('tutor_assessment_attempts')
export class AssessmentAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @Column({ default: 'speaking' })
  category: 'speaking' | 'writing';

  @Column()
  score: number; // out of 30

  @Column()
  passed: boolean;

  @Column({ type: 'jsonb' })
  answers: { questionId: string; selectedOption: number; isCorrect: boolean }[];

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
