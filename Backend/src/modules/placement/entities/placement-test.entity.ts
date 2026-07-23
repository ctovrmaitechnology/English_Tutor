import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('placement_tests')
export class PlacementTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 26 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'smallint' })
  score: number;

  @Column({ type: 'varchar', length: 50 })
  level: string;

  @Column({ type: 'jsonb' })
  metaScoreData: any;

  @CreateDateColumn()
  createdAt: Date;
}
