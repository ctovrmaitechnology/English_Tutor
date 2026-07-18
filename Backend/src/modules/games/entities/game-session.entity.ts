import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('game_sessions')
export class GameSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  gameType: string;
  // WORD_CHAIN | SYNONYM_STORM | WORD_AMNESIA | SPEED_RUN
  // GRAMMAR_NINJA | SENTENCE_BUILDER | ERROR_HUNT | TENSE_TRANSFORMER
  // ANGRY_CUSTOMER | EMAIL_RACE | HOLD_MUSIC | JARGON_MASTER
  // STORY_BUILDER | NEWS_ANCHOR | JOB_INTERVIEW | DEBATE_ME
  // TONGUE_TWISTER | ECHO_MASTER | ACCENT_DRILL | SPEED_SPEAK

  @Column()
  category: string;
  // VOCABULARY | GRAMMAR | BPO | STORY | VOICE | DAILY

  @Column({ default: 'BEGINNER' })
  difficulty: string;

  @Column({ default: 0 })
  score: number;

  @Column({ default: 0 })
  maxScore: number;

  @Column({ type: 'float', default: 0 })
  accuracy: number;

  @Column({ default: 0 })
  xpEarned: number;

  @Column({ default: 0 })
  duration: number; // seconds

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  gameData: object; // stores game-specific state

  @Column({ type: 'jsonb', default: '[]' })
  answers: object[]; // stores all Q&A history

  @CreateDateColumn()
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}