// src/entities/facilityStaff.ts
import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user';
import { Facility } from './facility';
import { Role } from './role';

@Entity('facility_staff')
export class FacilityStaff {
  @PrimaryColumn({ type: 'bigint', name: 'user_id' })
  userId: number;

  @PrimaryColumn({ type: 'bigint', name: 'facility_id' })
  facilityId: number;

  @PrimaryColumn({ type: 'smallint', name: 'role_id' })
  roleId: number;

  @ManyToOne(() => User, (u) => u.facilityStaff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Facility, (f) => f.staffLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ManyToOne(() => Role, (r) => r.facilityStaff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
