import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Unique, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('tutor_module_progress')
@Unique(['userId', 'subModuleId'])
export class ModuleProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  category: string; // 'speaking' | 'writing'

  @Column()
  moduleId: string; // e.g., 'sp-1', 'wr-1'

  @Column()
  subModuleId: string; // e.g., 'sp-1-1'

  @Column({ default: true })
  completed: boolean;

  @CreateDateColumn()
  completedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
