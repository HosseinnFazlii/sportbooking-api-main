// src/entities/tournamentRegStatus.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tournament_reg_statuses')
export class TournamentRegStatus {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'text' })
  label: string;
}
