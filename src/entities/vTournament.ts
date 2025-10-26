import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'v_tournaments' })
export class VTournament {
  @ViewColumn()
  id: number;

  @ViewColumn()
  title: string;

  @ViewColumn({ name: 'sport_id' })
  sportId: number;

  @ViewColumn({ name: 'sport_name' })
  sportName: string;

  @ViewColumn({ name: 'type_id' })
  typeId: number;

  @ViewColumn({ name: 'type_code' })
  typeCode: string;

  @ViewColumn({ name: 'type_label' })
  typeLabel: string;

  @ViewColumn({ name: 'min_capacity' })
  minCapacity: number;

  @ViewColumn({ name: 'max_capacity' })
  maxCapacity: number;

  @ViewColumn({ name: 'booking_deadline' })
  bookingDeadline: Date;

  @ViewColumn({ name: 'start_at' })
  startAt: Date;

  @ViewColumn({ name: 'end_at' })
  endAt: Date;

  @ViewColumn({ name: 'facility_id' })
  facilityId: number | null;

  @ViewColumn({ name: 'facility_name' })
  facilityName: string | null;

  @ViewColumn({ name: 'event_place_id' })
  eventPlaceId: number | null;

  @ViewColumn({ name: 'event_place_name' })
  eventPlaceName: string | null;

  @ViewColumn({ name: 'event_slot' })
  eventSlot: any | null;

  @ViewColumn({ name: 'is_active' })
  isActive: boolean;

  @ViewColumn({ name: 'created_by' })
  createdBy: number | null;

  @ViewColumn({ name: 'created_by_name' })
  createdByName: string | null;

  @ViewColumn({ name: 'registration_count' })
  registrationCount: number;

  @ViewColumn({ name: 'match_count' })
  matchCount: number;

  @ViewColumn({ name: 'standing_count' })
  standingCount: number;

  @ViewColumn({ name: 'is_ongoing' })
  isOngoing: boolean;
}
