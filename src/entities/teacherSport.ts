// src/entities/teacherSport.ts
import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user';
import { Sport } from './sport';

@Entity('teacher_sports')
export class TeacherSport {
  @PrimaryColumn({ type: 'bigint', name: 'teacher_id' })
  teacherId: number;

  @PrimaryColumn({ type: 'smallint', name: 'sport_id' })
  sportId: number;

  @ManyToOne(() => User, (u) => u.teacherSports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @ManyToOne(() => Sport, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sport_id' })
  sport: Sport;
}
