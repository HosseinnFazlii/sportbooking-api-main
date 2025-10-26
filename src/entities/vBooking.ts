import { ViewEntity, ViewColumn } from 'typeorm';
import { numericColumnTransformer } from './transformers';

@ViewEntity({ name: 'v_bookings' })
export class VBooking {
  @ViewColumn()
  id: number;

  @ViewColumn({ name: 'user_id' })
  userId: number;

  @ViewColumn({ name: 'user_full_name' })
  userFullName: string;

  @ViewColumn({ name: 'mobile' })
  mobile: string;

  @ViewColumn()
  email: string | null;

  @ViewColumn({ name: 'status_code' })
  statusCode: string;

  @ViewColumn({ transformer: numericColumnTransformer })
  total: number;

  @ViewColumn()
  currency: string;

  @ViewColumn({ name: 'hold_expires_at' })
  holdExpiresAt: Date | null;

  @ViewColumn({ name: 'created_at' })
  createdAt: Date;

  @ViewColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ViewColumn({ name: 'is_active' })
  isActive: boolean;

  @ViewColumn({ name: 'line_count' })
  lineCount: number;

  @ViewColumn({ name: 'total_qty' })
  totalQty: number;

  @ViewColumn({ name: 'first_start_at' })
  firstStartAt: Date | null;

  @ViewColumn({ name: 'last_end_at' })
  lastEndAt: Date | null;
}
