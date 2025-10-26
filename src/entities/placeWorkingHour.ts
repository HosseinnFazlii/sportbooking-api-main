// src/entities/placeWorkingHour.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, CreateDateColumn, UpdateDateColumn, Check,
} from 'typeorm';
import { Place } from './place';

@Unique(['placeId', 'weekday', 'segmentNo'])
@Check(`"weekday" BETWEEN 0 AND 6`)
@Check(`"segment_no" >= 1`)
@Entity('place_working_hours')
export class PlaceWorkingHour {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'place_id' })
  placeId: number;

  @ManyToOne(() => Place, (p) => p.workingHours, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'place_id' })
  place: Place;

  @Column({ type: 'smallint' })
  weekday: number;

  @Column({ type: 'smallint', name: 'segment_no', default: 1 })
  segmentNo: number;

  @Column({ type: 'time', name: 'open_time' })
  openTime: string;

  @Column({ type: 'time', name: 'close_time' })
  closeTime: string;

  @Column({ type: 'boolean', name: 'is_closed', default: false })
  isClosed: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
