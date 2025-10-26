// src/entities/tournamentStanding.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Tournament } from './tournament';
import { User } from './user';

@Unique(['tournamentId', 'userId'])
@Entity('tournament_standings')
export class TournamentStanding {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'tournament_id' })
  tournamentId: number;

  @ManyToOne(() => Tournament, (t) => t.standings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (u) => u.tournamentStandings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'int', default: 0 })
  wins: number;

  @Column({ type: 'int', default: 0 })
  losses: number;

  @Column({ type: 'int', default: 0 })
  draws: number;

  @Column({ type: 'int', name: 'score_for', default: 0 })
  scoreFor: number;

  @Column({ type: 'int', name: 'score_against', default: 0 })
  scoreAgainst: number;
}
