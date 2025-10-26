import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
} from 'typeorm';
import { Place } from './place';
import { PlacePriceRule } from './placePriceRule';

@Check(`"session_duration_minutes" >= 60 AND "session_duration_minutes" % 60 = 0`)
@Check(`"effective_until" IS NULL OR "effective_from" <= "effective_until"`)
@Entity('place_pricing_profiles')
export class PlacePricingProfile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'place_id' })
  placeId: number;

  @ManyToOne(() => Place, (place) => place.pricingProfiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'place_id' })
  place: Place;

  @Column({ type: 'text', default: 'Default' })
  name: string;

  @Column({ type: 'smallint', name: 'session_duration_minutes', default: 60 })
  sessionDurationMinutes: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'base_price' })
  basePrice: string;

  @Column({ type: 'char', length: 3, default: 'AED' })
  currency: string;

  @Column({ type: 'text', default: 'Asia/Dubai' })
  timezone: string;

  @Column({ type: 'date', name: 'effective_from', default: () => 'CURRENT_DATE' })
  effectiveFrom: string;

  @Column({ type: 'date', name: 'effective_until', nullable: true })
  effectiveUntil?: string;

  @Column({
    type: 'daterange',
    name: 'effective_range',
    generatedType: 'STORED',
    asExpression: "daterange(effective_from, COALESCE(effective_until, 'infinity'::date), '[]')",
    insert: false,
    update: false,
  })
  effectiveRange: any;

  @Column({ type: 'boolean', name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => PlacePriceRule, (rule) => rule.pricingProfile)
  rules: PlacePriceRule[];
}
