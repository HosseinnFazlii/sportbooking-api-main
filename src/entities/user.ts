// src/entities/user.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne,
} from 'typeorm';
import { Gender } from './gender';
import { Country } from './country';
import { State } from './state';
import { City } from './city';
import { FacilityStaff } from './facilityStaff';
import { Session } from './session';
import { Booking } from './booking';
import { Course } from './course';
import { CourseSession } from './courseSession';
import { TeacherProfile } from './teacherProfile';
import { TeacherSport } from './teacherSport';
import { TeacherCity } from './teacherCity';
import { TeacherWorkingHour } from './teacherWorkingHour';
import { BookingLine } from './bookingLine';
import { Tournament } from './tournament';
import { TournamentRegistration } from './tournamentRegistration';
import { TournamentMatch } from './tournamentMatch';
import { TournamentStanding } from './tournamentStanding';
import { Role } from './role';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'mobile' })
  mobile: number;

  @Column({ type: 'boolean', name: 'mobile_verified', default: false })
  mobileVerified: boolean;

  @Column({ type: 'citext', nullable: true })
  email?: string;

  @Column({ type: 'text', name: 'name' })
  name: string;

  @Column({ type: 'smallint', name: 'gender_id', nullable: true })
  genderId?: number;

  @ManyToOne(() => Gender, { nullable: true })
  @JoinColumn({ name: 'gender_id' })
  gender?: Gender;

  @Column({ type: 'smallint', name: 'role_id', nullable: true })
  roleId?: number | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @Column({ type: 'date', nullable: true })
  birthdate?: string;

  @Column({ type: 'bytea', name: 'picture', nullable: true })
  picture?: Buffer;

  @Column({ type: 'text', name: 'password_hash', nullable: true })
  passwordHash?: string;

  @Column({ type: 'timestamptz', name: 'password_set_at', nullable: true })
  passwordSetAt?: Date;

  @Column({ type: 'boolean', name: 'password_must_change', default: false })
  passwordMustChange: boolean;

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

  @Column({ type: 'boolean', name: 'marketing_opt_in', default: false })
  marketingOptIn: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => FacilityStaff, (fs) => fs.user)
  facilityStaff: FacilityStaff[];

  @OneToMany(() => Session, (s) => s.user)
  sessions: Session[];

  @OneToMany(() => Booking, (b) => b.user)
  bookings: Booking[];

  @OneToMany(() => Course, (c) => c.createdByUser)
  createdCourses: Course[];

  @OneToMany(() => CourseSession, (cs) => cs.teacher)
  taughtSessions: CourseSession[];

  @OneToOne(() => TeacherProfile, (tp) => tp.user)
  teacherProfile?: TeacherProfile;

  @OneToMany(() => TeacherSport, (ts) => ts.teacher)
  teacherSports: TeacherSport[];

  @OneToMany(() => TeacherCity, (tc) => tc.teacher)
  teacherCities: TeacherCity[];

  @OneToMany(() => TeacherWorkingHour, (tw) => tw.teacher)
  teacherWorkingHours: TeacherWorkingHour[];

  @OneToMany(() => BookingLine, (bl) => bl.teacher)
  linesAsTeacher: BookingLine[];

  @OneToMany(() => Tournament, (t) => t.createdByUser)
  tournamentsCreated: Tournament[];

  @OneToMany(() => TournamentRegistration, (tr) => tr.user)
  tournamentRegistrations: TournamentRegistration[];

  @OneToMany(() => TournamentMatch, (m) => m.aUser)
  matchesAsA: TournamentMatch[];

  @OneToMany(() => TournamentMatch, (m) => m.bUser)
  matchesAsB: TournamentMatch[];

  @OneToMany(() => TournamentMatch, (m) => m.winnerUser)
  matchesWon: TournamentMatch[];

  @OneToMany(() => TournamentStanding, (ts) => ts.user)
  tournamentStandings: TournamentStanding[];
}
