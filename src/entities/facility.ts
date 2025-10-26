// src/entities/facility.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import { Country } from './country';
import { State } from './state';
import { City } from './city';
import { Place } from './place';
import { FacilityStaff } from './facilityStaff';
import { Tournament } from './tournament';

@Entity('facilities')
export class Facility {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: true, unique: true })
  code?: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'citext', nullable: true, unique: true })
  slug?: string;

  @Column({ type: 'text', default: 'Asia/Dubai' })
  timezone: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  city?: string;

  @Column({ type: 'text', nullable: true })
  state?: string;

  @Column({ type: 'text', nullable: true })
  country?: string;

  @Column({ type: 'text', name: 'postal_code', nullable: true })
  postalCode?: string;

  @Column({ type: 'smallint', name: 'country_id', nullable: true })
  countryId?: number;

  @ManyToOne(() => Country, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'country_id' })
  countryRef?: Country;

  @Column({ type: 'int', name: 'state_id', nullable: true })
  stateId?: number;

  @ManyToOne(() => State, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'state_id' })
  stateRef?: State;

  @Column({ type: 'int', name: 'city_id', nullable: true })
  cityId?: number;

  @ManyToOne(() => City, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'city_id' })
  cityRef?: City;

  @Column({ type: 'text', nullable: true })
  phone?: string;

  @Column({ type: 'citext', nullable: true })
  email?: string;

  @Column({ type: 'int', name: 'postal_code_int', nullable: true })
  postalCodeInt?: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => Place, (p) => p.facility)
  places: Place[];

  @OneToMany(() => FacilityStaff, (fs) => fs.facility)
  staffLinks: FacilityStaff[];

  @OneToMany(() => Tournament, (t) => t.facility)
  tournaments: Tournament[];
}
