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
import { PlacePricingProfile } from './placePricingProfile';

@Check(`"override_type" IN ('set','delta_amount','delta_percent')`)
@Check(`"override_type" <> 'delta_percent' OR ("override_value" >= -100 AND "override_value" <= 100)`)
@Check(`"currency" IS NOT NULL OR "override_type" = 'delta_percent'`)
@Entity('place_price_rules')
export class PlacePriceRule {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'pricing_profile_id' })
  pricingProfileId: number;

  @ManyToOne(() => PlacePricingProfile, (profile) => profile.rules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pricing_profile_id' })
  pricingProfile: PlacePricingProfile;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'smallint', default: 100 })
  priority: number;

  @Column({ type: 'text', name: 'override_type' })
  overrideType: 'set' | 'delta_amount' | 'delta_percent';

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'override_value' })
  overrideValue: string;

  @Column({ type: 'char', length: 3, nullable: true })
  currency?: string;

  @Column({ type: 'daterange', name: 'effective_dates', nullable: true })
  effectiveDates?: any;

  @Column({ type: 'text', name: 'time_window', nullable: true })
  timeWindow?: string;

  @Column({ type: 'smallint', array: true, nullable: true })
  weekdays?: number[];

  @Column({ type: 'date', array: true, name: 'specific_dates', nullable: true })
  specificDates?: string[];

  @Column({ type: 'jsonb', name: 'applies_to_calendar_flags', nullable: true })
  appliesToCalendarFlags?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  recurrence?: string;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
