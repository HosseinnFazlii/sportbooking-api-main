// src/entities/tournamentMatch.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Check } from 'typeorm';
import { Tournament } from './tournament';
import { User } from './user';
import { Place } from './place';

@Entity('tournament_matches')
export class TournamentMatch {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'tournament_id' })
  tournamentId: number;

  @ManyToOne(() => Tournament, (t) => t.matches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ type: 'int', name: 'round_no', default: 1 })
  roundNo: number;

  @Column({ type: 'int', name: 'match_no', default: 1 })
  matchNo: number;

  @Column({ type: 'bigint', name: 'a_user_id', nullable: true })
  aUserId?: number;

  @ManyToOne(() => User, (u) => u.matchesAsA, { nullable: true })
  @JoinColumn({ name: 'a_user_id' })
  aUser?: User;

  @Column({ type: 'bigint', name: 'b_user_id', nullable: true })
  bUserId?: number;

  @ManyToOne(() => User, (u) => u.matchesAsB, { nullable: true })
  @JoinColumn({ name: 'b_user_id' })
  bUser?: User;

  @Column({ type: 'bigint', name: 'winner_user_id', nullable: true })
  winnerUserId?: number;

  @ManyToOne(() => User, (u) => u.matchesWon, { nullable: true })
  @JoinColumn({ name: 'winner_user_id' })
  winnerUser?: User;

  @Column({ type: 'int', name: 'a_score', nullable: true })
  aScore?: number;

  @Column({ type: 'int', name: 'b_score', nullable: true })
  bScore?: number;

  @Column({ type: 'bigint', name: 'place_id', nullable: true })
  placeId?: number;

  @ManyToOne(() => Place, (p) => p.matches, { nullable: true })
  @JoinColumn({ name: 'place_id' })
  place?: Place;

  @Column({ type: 'tstzrange', nullable: true })
  slot?: any;

  @Column({ type: 'text', default: 'scheduled' })
  status: 'scheduled' | 'completed' | 'cancelled';

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
