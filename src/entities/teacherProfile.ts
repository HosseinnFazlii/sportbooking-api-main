// src/entities/teacherProfile.ts
import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Check } from 'typeorm';
import { User } from './user';

@Check(`rating_avg IS NULL OR (rating_avg >= 0 AND rating_avg <= 5)`)
@Entity('teacher_profiles')
export class TeacherProfile {
  @PrimaryColumn({ type: 'bigint', name: 'user_id' })
  userId: number;

  @OneToOne(() => User, (u) => u.teacherProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, name: 'hourly_rate' })
  hourlyRate?: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, name: 'rating_avg', nullable: true })
  ratingAvg?: string;

  @Column({ type: 'int', name: 'rating_count', default: 0 })
  ratingCount: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
