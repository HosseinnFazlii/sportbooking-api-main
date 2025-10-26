// src/entities/tournamentRegistration.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tournament } from './tournament';
import { User } from './user';
import { TournamentRegStatus } from './tournamentRegStatus';

@Unique(['tournamentId', 'userId'])
@Entity('tournament_registrations')
export class TournamentRegistration {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'tournament_id' })
  tournamentId: number;

  @ManyToOne(() => Tournament, (t) => t.registrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (u) => u.tournamentRegistrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'smallint', name: 'status_id' })
  statusId: number;

  @ManyToOne(() => TournamentRegStatus)
  @JoinColumn({ name: 'status_id' })
  status: TournamentRegStatus;

  @Column({ type: 'timestamptz', name: 'hold_expires_at', nullable: true })
  holdExpiresAt?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
