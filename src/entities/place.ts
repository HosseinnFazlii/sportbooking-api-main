// src/entities/place.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn, Check,
} from 'typeorm';
import { Facility } from './facility';
import { Sport } from './sport';
import { PlaceWorkingHour } from './placeWorkingHour';
import { PlacePricingProfile } from './placePricingProfile';
import { BookingLine } from './bookingLine';
import { CourseSession } from './courseSession';
import { Tournament } from './tournament';
import { TournamentMatch } from './tournamentMatch';

@Check(`"min_capacity" >= 1 AND "max_capacity" >= 1 AND "min_capacity" <= "max_capacity"`)
@Entity('places')
export class Place {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'facility_id' })
  facilityId: number;

  @ManyToOne(() => Facility, (f) => f.places, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'smallint', name: 'sport_id' })
  sportId: number;

  @ManyToOne(() => Sport, (s) => s.places)
  @JoinColumn({ name: 'sport_id' })
  sport: Sport;

  @Column({ type: 'text', nullable: true })
  surface?: string;

  @Column({ type: 'boolean', default: false })
  indoor: boolean;

  @Column({ type: 'int', name: 'min_capacity', default: 1 })
  minCapacity: number;

  @Column({ type: 'int', name: 'max_capacity', default: 1 })
  maxCapacity: number;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  attributes: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => PlaceWorkingHour, (h) => h.place)
  workingHours: PlaceWorkingHour[];

  @OneToMany(() => PlacePricingProfile, (profile) => profile.place)
  pricingProfiles: PlacePricingProfile[];

  @OneToMany(() => BookingLine, (bl) => bl.place)
  bookingLines: BookingLine[];

  @OneToMany(() => CourseSession, (cs) => cs.place)
  courseSessions: CourseSession[];

  @OneToMany(() => Tournament, (t) => t.eventPlace)
  tournaments: Tournament[];

  @OneToMany(() => TournamentMatch, (m) => m.place)
  matches: TournamentMatch[];
}
