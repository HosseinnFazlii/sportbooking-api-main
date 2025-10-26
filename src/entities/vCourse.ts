import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'v_courses' })
export class VCourse {
  @ViewColumn()
  id: number;

  @ViewColumn()
  title: string;

  @ViewColumn({ name: 'sport_id' })
  sportId: number;

  @ViewColumn({ name: 'sport_name' })
  sportName: string;

  @ViewColumn({ name: 'is_active' })
  isActive: boolean;

  @ViewColumn({ name: 'booking_deadline' })
  bookingDeadline: Date;

  @ViewColumn({ name: 'min_capacity' })
  minCapacity: number;

  @ViewColumn({ name: 'max_capacity' })
  maxCapacity: number;

  @ViewColumn({ name: 'created_by' })
  createdBy: number | null;

  @ViewColumn({ name: 'created_by_name' })
  createdByName: string | null;

  @ViewColumn({ name: 'session_count' })
  sessionCount: number;

  @ViewColumn({ name: 'upcoming_session_count' })
  upcomingSessionCount: number;

  @ViewColumn({ name: 'min_session_price' })
  minSessionPrice: string | null;

  @ViewColumn({ name: 'max_session_price' })
  maxSessionPrice: string | null;

  @ViewColumn({ name: 'first_session_start' })
  firstSessionStart: Date | null;

  @ViewColumn({ name: 'last_session_end' })
  lastSessionEnd: Date | null;
}
