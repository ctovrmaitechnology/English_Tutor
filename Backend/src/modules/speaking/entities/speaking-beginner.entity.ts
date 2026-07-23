import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('speaking_beginner')
export class SpeakingBeginner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'question_number', type: 'int', nullable: true })
  questionNumber: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt: Date;

  @Column({ name: 'module_id', type: 'varchar', length: 20, nullable: true })
  moduleId: string;

  @Column({ type: 'varchar', nullable: true })
  level: string;

  @Column({ type: 'int', nullable: true })
  lesson: number;

  @Column({ type: 'text', nullable: true })
  question: string;

  @Column({ name: 'option_a', type: 'text', nullable: true })
  optionA?: string;

  @Column({ name: 'option_b', type: 'text', nullable: true })
  optionB?: string;

  @Column({ name: 'option_c', type: 'text', nullable: true })
  optionC?: string;

  @Column({ name: 'option_d', type: 'text', nullable: true })
  optionD?: string;

  @Column({ type: 'text', nullable: true })
  answer?: string;

  @Column({ name: 'lesson_id', type: 'varchar', nullable: true })
  lessonId: string;

  @Column({ type: 'varchar', nullable: true })
  part: string;

  @Column({ type: 'varchar', nullable: true })
  set: string;

  @Column({ name: 'correct_option', type: 'varchar', nullable: true })
  correctOption?: string;
}