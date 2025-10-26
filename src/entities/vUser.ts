import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'v_users' })
export class VUser {
  @ViewColumn()
  id: number;

  @ViewColumn({ name: 'name' })
  name: string;

  @ViewColumn({ name: 'full_name' })
  fullName: string;

  @ViewColumn()
  email: string | null;

  @ViewColumn({ name: 'mobile' })
  mobile: string;

  @ViewColumn({ name: 'mobile_verified' })
  mobileVerified: boolean;

  @ViewColumn({ name: 'is_active' })
  isActive: boolean;

  @ViewColumn({ name: 'created_at' })
  createdAt: Date;

  @ViewColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ViewColumn()
  gender: string | null;

  @ViewColumn({ name: 'country_name' })
  countryName: string | null;

  @ViewColumn({ name: 'state_name' })
  stateName: string | null;

  @ViewColumn({ name: 'city_name' })
  cityName: string | null;

  @ViewColumn({ name: 'rating_avg' })
  ratingAvg: string;

  @ViewColumn({ name: 'rating_count' })
  ratingCount: number;

  @ViewColumn({ name: 'is_teacher' })
  isTeacher: boolean;

  @ViewColumn()
  roles: string | null;
}
