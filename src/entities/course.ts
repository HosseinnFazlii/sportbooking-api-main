// src/entities/course.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Check,
} from 'typeorm';
import { Sport } from './sport';
import { User } from './user';
import { CourseImage } from './courseImage';
import { CourseSession } from './courseSession';

@Check(`"min_capacity" >= 1 AND "max_capacity" >= "min_capacity"`)
@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'smallint', name: 'sport_id' })
  sportId: number;

  @ManyToOne(() => Sport, (s) => s.courses)
  @JoinColumn({ name: 'sport_id' })
  sport: Sport;

  @Column({ type: 'int', name: 'min_capacity', default: 1 })
  minCapacity: number;

  @Column({ type: 'int', name: 'max_capacity', default: 20 })
  maxCapacity: number;

  @Column({ type: 'timestamptz', name: 'booking_deadline' })
  bookingDeadline: Date;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'bigint', name: 'created_by', nullable: true })
  createdBy?: number;

  @ManyToOne(() => User, (u) => u.createdCourses, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => CourseImage, (ci) => ci.course)
  images: CourseImage[];

  @OneToMany(() => CourseSession, (cs) => cs.course)
  sessions: CourseSession[];
}
