import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('module_progress')
export class ModuleProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'module_id', type: 'varchar' })
  moduleId: string;

  @Column({ name: 'sub_module_id', type: 'varchar', nullable: true })
  subModuleId: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
