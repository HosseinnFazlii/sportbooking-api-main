// src/entities/sport.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Place } from './place';
import { Course } from './course';
import { Tournament } from './tournament';

@Entity('sports')
export class Sport {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => Place, (p) => p.sport)
  places: Place[];

  @OneToMany(() => Course, (c) => c.sport)
  courses: Course[];

  @OneToMany(() => Tournament, (t) => t.sport)
  tournaments: Tournament[];
}
