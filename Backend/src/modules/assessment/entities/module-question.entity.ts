import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('module_questions')
export class ModuleQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt: Date;

  @Column({ name: 'module_id', type: 'varchar', length: 30 })
  moduleId: string;

  @Column({ type: 'varchar', length: 20 })
  set: string;

  @Column({ type: 'varchar', length: 10 })
  part: string;

  @Column({ name: 'question_number', type: 'int' })
  questionNumber: number;

  @Column({ type: 'float', default: 1 })
  marks: number;

  @Column({ type: 'text' })
  question: string;

  @Column({ name: 'option_a', type: 'text', nullable: true })
  optionA?: string;

  @Column({ name: 'option_b', type: 'text', nullable: true })
  optionB?: string;

  @Column({ name: 'option_c', type: 'text', nullable: true })
  optionC?: string;

  @Column({ name: 'option_d', type: 'text', nullable: true })
  optionD?: string;

  @Column({ name: 'correct_option', type: 'varchar', length: 5, nullable: true })
  correctOption?: string;

  @Column({ type: 'text', nullable: true })
  answer?: string;
}
