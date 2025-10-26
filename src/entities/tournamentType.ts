// src/entities/tournamentType.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tournament_types')
export class TournamentType {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'text' })
  label: string;
}
