import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user';
import { LogType } from './logType';

@Entity('logs')
export class Log {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'smallint', name: 'type_id', nullable: true })
  typeId?: number;

  @ManyToOne(() => LogType, { nullable: true })
  @JoinColumn({ name: 'type_id' })
  type?: LogType;

  @Column({ type: 'text', nullable: true })
  text1?: string;

  @Column({ type: 'text', nullable: true })
  text2?: string;

  @Column({ type: 'text', nullable: true })
  text3?: string;

  @Column({ type: 'text', nullable: true })
  text4?: string;

  @Column({ type: 'bigint', name: 'created_by', nullable: true })
  createdBy?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
