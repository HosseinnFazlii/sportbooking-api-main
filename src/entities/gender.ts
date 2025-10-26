// src/entities/gender.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('genders')
export class Gender {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  note?: string;
}
