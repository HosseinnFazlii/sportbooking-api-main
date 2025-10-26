// src/entities/bookingLine.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
} from 'typeorm';
import { Booking } from './booking';
import { Place } from './place';
import { PlacePricingProfile } from './placePricingProfile';
import { User } from './user';
import { CourseSession } from './courseSession';
import { numericColumnTransformer } from './transformers';

@Check('lower("slot") < upper("slot")')
@Check('"qty" >= 1')
@Entity('booking_lines')
export class BookingLine {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'booking_id' })
  bookingId: number;

  @ManyToOne(() => Booking, (b) => b.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'bigint', name: 'place_id' })
  placeId: number;

  @ManyToOne(() => Place, (p) => p.bookingLines)
  @JoinColumn({ name: 'place_id' })
  place: Place;

  @Column({ type: 'bigint', name: 'teacher_id', nullable: true })
  teacherId?: number;

  @ManyToOne(() => User, (u) => u.linesAsTeacher, { nullable: true })
  @JoinColumn({ name: 'teacher_id' })
  teacher?: User;

  @Column({ type: 'tstzrange' })
  slot: any;

  @Column({ type: 'int', default: 1 })
  qty: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericColumnTransformer })
  price: number;

  @Column({ type: 'char', length: 3, default: 'AED' })
  currency: string;

  @Column({ type: 'bigint', name: 'pricing_profile_id', nullable: true })
  pricingProfileId?: number;

  @ManyToOne(() => PlacePricingProfile, { nullable: true })
  @JoinColumn({ name: 'pricing_profile_id' })
  pricingProfile?: PlacePricingProfile;

  @Column({ type: 'bigint', array: true, name: 'applied_rule_ids', nullable: true })
  appliedRuleIds?: number[];

  @Column({ type: 'jsonb', name: 'pricing_details', default: () => `'{}'::jsonb` })
  pricingDetails: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'bigint', name: 'course_session_id', nullable: true })
  courseSessionId?: number;

  @ManyToOne(() => CourseSession, (cs) => cs.bookingLines, { nullable: true })
  @JoinColumn({ name: 'course_session_id' })
  courseSession?: CourseSession;
}
