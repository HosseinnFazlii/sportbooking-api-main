// src/entities/teacherCity.ts
import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user';
import { City } from './city';

@Entity('teacher_cities')
export class TeacherCity {
  @PrimaryColumn({ type: 'bigint', name: 'teacher_id' })
  teacherId: number;

  @PrimaryColumn({ type: 'int', name: 'city_id' })
  cityId: number;

  @ManyToOne(() => User, (u) => u.teacherCities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @ManyToOne(() => City, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'city_id' })
  city: City;
}
