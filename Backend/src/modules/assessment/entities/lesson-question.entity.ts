import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('tutor_lesson_questions')
export class LessonQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sectionId: string; // e.g., 'wr-1-1', 'sp-1-1'

  @Column({ nullable: true })
  sessionId: string; // alias for sectionId/subModuleId to match 'session id' request

  @Column()
  category: 'speaking' | 'writing';

  @Column({ nullable: true })
  prompt: string; // for speaking: prompt title, for writing: quiz heading

  @Column({ type: 'text' })
  questionText: string; // for speaking: reading text, for writing: question text

  @Column({ type: 'jsonb', nullable: true })
  options: string[]; // for writing MCQ options, null for speaking

  @Column({ nullable: true })
  correctOptionIndex: number; // for writing correct index, null for speaking

  @Column({ type: 'text', nullable: true })
  explanation: string; // for writing: explanation, for speaking: tip

  @CreateDateColumn()
  createdAt: Date;
}
