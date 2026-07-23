import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('tutor_user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ default: 0 })
  duration: number; // seconds on platform

  @Column({ default: 0 })
  aiTutorDuration: number; // seconds in AI chat

  @Column({ default: 'active' })
  status: string; // 'active' | 'ended'

  @CreateDateColumn()
  createdAt: Date;
}