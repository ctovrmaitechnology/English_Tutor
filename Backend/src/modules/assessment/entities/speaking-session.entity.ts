import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

/**
 * Stores in-progress and completed speaking assessment sessions.
 *
 * BEGINNER    gameData shape:
 *   { passages: [{ questionId, passage, transcript, similarityScore, passed }], currentIndex }
 *
 * INTERMEDIATE gameData shape:
 *   { scenarios: [...], currentScenario, currentTurn, maxTurns, turns: [...], scenarioScores: [] }
 *
 * ADVANCED gameData shape:
 *   { topics: [...], currentTopic, turns: [...], topicScores: [] }
 */
@Entity('tutor_speaking_sessions')
export class SpeakingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @Column({ default: false })
  completed: boolean;

  @Column({ default: 0 })
  finalScore: number; // 0-100

  @Column({ default: false })
  passed: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  gameData: object;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
