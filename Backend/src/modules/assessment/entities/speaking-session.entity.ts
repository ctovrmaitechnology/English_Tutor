import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('speaking_sessions')
export class SpeakingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ name: 'final_score', type: 'float', nullable: true })
  finalScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
