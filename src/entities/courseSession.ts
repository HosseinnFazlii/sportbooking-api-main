// src/entities/courseSession.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Check,
} from 'typeorm';
import { Course } from './course';
import { User } from './user';
import { Place } from './place';
import { BookingLine } from './bookingLine';

@Check(`lower(slot) < upper(slot)`)
@Entity('course_sessions')
export class CourseSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'course_id' })
  courseId: number;

  @ManyToOne(() => Course, (c) => c.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ type: 'bigint', name: 'teacher_id' })
  teacherId: number;

  @ManyToOne(() => User, (u) => u.taughtSessions)
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column({ type: 'bigint', name: 'place_id' })
  placeId: number;

  @ManyToOne(() => Place, (p) => p.courseSessions)
  @JoinColumn({ name: 'place_id' })
  place: Place;

  @Column({ type: 'tstzrange' })
  slot: any;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  price: string;

  @Column({ type: 'int', name: 'max_capacity', default: 10 })
  maxCapacity: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => BookingLine, (bl) => bl.courseSession)
  bookingLines: BookingLine[];
}
