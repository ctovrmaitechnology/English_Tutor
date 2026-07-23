import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  title: string;

  @Column({ type: 'varchar', nullable: true })
  category: string;

  @Column({ name: 'module_name', type: 'varchar', nullable: true })
  moduleName: string;

  @Column({ type: 'float', nullable: true })
  score: number;

  @Column({ name: 'recipient_name', type: 'varchar', nullable: true })
  recipientName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
