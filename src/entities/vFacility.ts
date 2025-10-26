import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'v_facilities' })
export class VFacility {
  @ViewColumn()
  id: number;

  @ViewColumn()
  name: string;

  @ViewColumn()
  slug: string | null;

  @ViewColumn()
  timezone: string;

  @ViewColumn()
  city: string | null;

  @ViewColumn()
  state: string | null;

  @ViewColumn()
  country: string | null;

  @ViewColumn({ name: 'created_at' })
  createdAt: Date;

  @ViewColumn({ name: 'place_count' })
  placeCount: number;

  @ViewColumn({ name: 'sports_count' })
  sportsCount: number;

  @ViewColumn({ name: 'tournaments_count' })
  tournamentsCount: number;

  @ViewColumn({ name: 'upcoming_booking_lines' })
  upcomingBookingLines: number;

  @ViewColumn({ name: 'next_booking_start' })
  nextBookingStart: Date | null;
}
