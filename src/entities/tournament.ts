// src/entities/tournament.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Check,
} from 'typeorm';
import { Sport } from './sport';
import { TournamentType } from './tournamentType';
import { Facility } from './facility';
import { Place } from './place';
import { User } from './user';
import { TournamentImage } from './tournamentImage';
import { TournamentRegistration } from './tournamentRegistration';
import { TournamentMatch } from './tournamentMatch';
import { TournamentStanding } from './tournamentStanding';

@Check(`"min_capacity" >= 2 AND "max_capacity" >= "min_capacity"`)
@Check(`"start_at" < "end_at"`)
@Check(`"booking_deadline" <= "start_at"`)
@Entity('tournaments')
export class Tournament {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'smallint', name: 'sport_id' })
  sportId: number;

  @ManyToOne(() => Sport, (s) => s.tournaments)
  @JoinColumn({ name: 'sport_id' })
  sport: Sport;

  @Column({ type: 'smallint', name: 'type_id' })
  typeId: number;

  @ManyToOne(() => TournamentType)
  @JoinColumn({ name: 'type_id' })
  type: TournamentType;

  @Column({ type: 'int', name: 'min_capacity', default: 2 })
  minCapacity: number;

  @Column({ type: 'int', name: 'max_capacity', default: 64 })
  maxCapacity: number;

  @Column({ type: 'timestamptz', name: 'booking_deadline' })
  bookingDeadline: Date;

  @Column({ type: 'timestamptz', name: 'start_at' })
  startAt: Date;

  @Column({ type: 'timestamptz', name: 'end_at' })
  endAt: Date;

  @Column({ type: 'bigint', name: 'facility_id', nullable: true })
  facilityId?: number;

  @ManyToOne(() => Facility, (f) => f.tournaments, { nullable: true })
  @JoinColumn({ name: 'facility_id' })
  facility?: Facility;

  @Column({ type: 'bigint', name: 'event_place_id', nullable: true })
  eventPlaceId?: number;

  @ManyToOne(() => Place, (p) => p.tournaments, { nullable: true })
  @JoinColumn({ name: 'event_place_id' })
  eventPlace?: Place;

  @Column({ type: 'tstzrange', name: 'event_slot', nullable: true })
  eventSlot?: any;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'bigint', name: 'created_by', nullable: true })
  createdBy?: number;

  @ManyToOne(() => User, (u) => u.tournamentsCreated, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => TournamentImage, (ti) => ti.tournament)
  images: TournamentImage[];

  @OneToMany(() => TournamentRegistration, (tr) => tr.tournament)
  registrations: TournamentRegistration[];

  @OneToMany(() => TournamentMatch, (tm) => tm.tournament)
  matches: TournamentMatch[];

  @OneToMany(() => TournamentStanding, (ts) => ts.tournament)
  standings: TournamentStanding[];
}
