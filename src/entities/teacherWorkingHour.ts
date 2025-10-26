// src/entities/teacherWorkingHour.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, CreateDateColumn, UpdateDateColumn, Check } from 'typeorm';
import { User } from './user';

@Unique(['teacherId', 'weekday', 'segmentNo'])
@Check(`"weekday" BETWEEN 0 AND 6`)
@Check(`"segment_no" >= 1`)
@Entity('teacher_working_hours')
export class TeacherWorkingHour {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'teacher_id' })
  teacherId: number;

  @ManyToOne(() => User, (u) => u.teacherWorkingHours, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column({ type: 'smallint' })
  weekday: number;

  @Column({ type: 'smallint', name: 'segment_no', default: 1 })
  segmentNo: number;

  @Column({ type: 'time', name: 'open_time' })
  openTime: string;

  @Column({ type: 'time', name: 'close_time' })
  closeTime: string;

  @Column({ type: 'boolean', name: 'is_closed', default: false })
  isClosed: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
