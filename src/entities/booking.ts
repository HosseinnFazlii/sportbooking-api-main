// src/entities/booking.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user';
import { BookingStatus } from './bookingStatus';
import { BookingLine } from './bookingLine';
import { numericColumnTransformer } from './transformers';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (u) => u.bookings)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'smallint', name: 'status_id' })
  statusId: number;

  @ManyToOne(() => BookingStatus)
  @JoinColumn({ name: 'status_id' })
  status: BookingStatus;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericColumnTransformer })
  total: number;

  @Column({ type: 'char', length: 3, default: 'AED' })
  currency: string;

  @Column({ type: 'uuid', name: 'idempotency_key', nullable: true, unique: true })
  idempotencyKey?: string;

  @Column({ type: 'timestamptz', name: 'hold_expires_at', nullable: true })
  holdExpiresAt?: Date;

  @Column({ type: 'text', name: 'payment_reference', nullable: true })
  paymentReference?: string;

  @Column({ type: 'text', name: 'payment_failure_reason', nullable: true })
  paymentFailureReason?: string;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => BookingLine, (bl) => bl.booking)
  lines: BookingLine[];
}
