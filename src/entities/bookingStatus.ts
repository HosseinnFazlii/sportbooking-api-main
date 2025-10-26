// src/entities/bookingStatus.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('booking_statuses')
export class BookingStatus {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'text' })
  label: string;
}
