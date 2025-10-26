import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user';

@Entity('log_types')
export class LogType {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: number;

  // Single, machine-readable key (case-insensitive in Postgres via citext)
  @Column({ type: 'citext', unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'bigint', name: 'created_by', nullable: true })
  createdBy?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
