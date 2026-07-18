import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('tutor_assessment_questions')
export class AssessmentQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @Column({ default: 'speaking' })
  category: 'speaking' | 'writing';

  @Column({ type: 'text' })
  questionText: string;

  @Column({ type: 'jsonb' })
  options: string[]; // array of 4 options

  @Column()
  correctOptionIndex: number; // 0 to 3

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @CreateDateColumn()
  createdAt: Date;
}
