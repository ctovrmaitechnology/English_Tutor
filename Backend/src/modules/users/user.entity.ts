import {
  Entity,
  PrimaryColumn,          // ← change from PrimaryGeneratedColumn
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 26 })   // ← varchar for ULID
  id: string;

  @Column({ length: 50 })
  first_name: string;

  @Column({ length: 50 })
  last_name: string;

  @Column({ unique: true, length: 10 })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ length: 50 })
  character: string;

  @Column({ select: false })
  password_hash: string;

  @Column({ nullable: true, length: 20 })
  phone: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true, length: 50 })
  batch: string; // e.g. 'Batch A', 'Batch B'

  @Column({ default: false })
  hasSelectedCharacter: boolean;

  @Column({ nullable: true, length: 30 })
  role: string | null; // null | 'Agent' | 'Team Lead' | 'Trainer'


  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date;
}