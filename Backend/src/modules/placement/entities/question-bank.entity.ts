import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type QuestionSet = 'A' | 'B' | 'C';

@Entity('question_banks')
export class QuestionBank {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'set_code', type: 'varchar', length: 10 })
  set: string;

  @Column({ name: 'skill_type', type: 'varchar', length: 50 })
  type: string;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({ name: 'options', type: 'simple-array', nullable: true })
  options: string[];

  @Column({ name: 'answer', type: 'text' })
  answer: string;
}
