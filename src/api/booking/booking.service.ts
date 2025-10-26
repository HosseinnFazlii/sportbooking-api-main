import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  IsNull,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { BaseService } from '../../common/base.service';
import { IApiResponse } from '../../types/response';
import { Booking } from '../../entities/booking';
import { BookingLine } from '../../entities/bookingLine';
import { BookingStatus } from '../../entities/bookingStatus';
import { VBooking } from '../../entities/vBooking';
import { Place } from '../../entities/place';
import { AddLineDto } from './dto/add-line.dto';
import { CreateHoldDto } from './dto/create-hold.dto';
import { PricingService, PriceQuote, RateCardResponse } from './pricing.service';

@Injectable()
export class BookingService extends BaseService<Booking, VBooking> {
  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lineRepo: Repository<BookingLine>,
    @InjectRepository(BookingStatus) private readonly statusRepo: Repository<BookingStatus>,
    @InjectRepository(Place) private readonly placeRepo: Repository<Place>,
    @InjectRepository(VBooking) vBookingRepo: Repository<VBooking>,
    private readonly pricing: PricingService,
    dataSource: DataSource,
  ) {
    super(bookingRepo, dataSource, {
      searchableColumns: ['userFullName', 'mobile', 'email', 'statusCode', 'currency'],
      defaultSort: '-createdAt',
      userScope: { enabled: true, userIdProperty: 'userId' }, // regular users see their own bookings
      // facility scope handled by override below (joins lines -> places -> facility)
      list: { repo: vBookingRepo, alias: 'vb' },
    });
  }

  /** Facility scoping for listings: restrict facility staff to bookings that have lines in their facilities. */
  protected override async applyAccessControl<E = Booking>(
    qb: SelectQueryBuilder<E>,
    user?: any,
  ): Promise<SelectQueryBuilder<E>> {
    qb = await super.applyAccessControl(qb, user);
    if (!(await this.isAdmin(user))) {
      const facilityIds = await this.getUserFacilityIds(user);
      if (facilityIds.length) {
        qb.leftJoin(`${this.alias}.lines`, 'bl', 'bl.deletedAt IS NULL')
          .leftJoin('bl.place', 'pl')
          .andWhere('pl.facilityId IN (:...facilityIds)', { facilityIds })
          .distinct(true);
      }
    }
    return qb;
  }

  /** Resolve a booking_status by code (e.g., 'hold', 'confirmed', 'awaiting_teacher', 'cancelled'). */
  private async statusId(code: string): Promise<number | null> {
    const row = await this.statusRepo.findOne({ where: { code } as any });
    return row ? row.id : null;
  }

  /** Create a hold booking (optionally with lines). */
  async createHold(dto: CreateHoldDto, userJwt: any): Promise<IApiResponse<Booking>> {
    const userId = Number(userJwt?.id);
    if (!userId) throw new UnauthorizedException();

    // Idempotency: if a booking with the given key exists for this user, return it
    if (dto.idempotencyKey) {
      const existing = await this.bookingRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey, userId } });
      if (existing) return { data: existing };
    }

    const holdId = await this.statusId('hold');
    const awaitingId = await this.statusId('awaiting_teacher');
    const statusId = holdId ?? awaitingId; // fallback
    if (!statusId) throw new BadRequestException('Missing booking status (hold/awaiting_teacher)');

    const holdSeconds = dto.holdSeconds ?? 900;
    const expires = new Date(Date.now() + holdSeconds * 1000);

    const booking = this.bookingRepo.create({
      userId,
      statusId,
      currency: (dto.currency || 'AED').toUpperCase(),
      idempotencyKey: dto.idempotencyKey,
      holdExpiresAt: expires,
    });
    let saved = await this.bookingRepo.save(booking);

    // Optionally add lines
    if (dto.lines?.length) {
      for (const ln of dto.lines) {
        await this.addLineInternal(saved, ln, userJwt);
      }
      await this.reprice(saved.id);
      saved = await this.bookingRepo.findOneOrFail({ where: { id: saved.id } });
    }

    return { data: saved };
  }

  /** Add a line to a booking (enforces facility rights and lets DB triggers validate capacity/eligibility). */
  async addLine(bookingId: number, dto: AddLineDto, userJwt: any): Promise<IApiResponse<BookingLine>> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.ensureCanMutateForPlace(booking, dto.placeId, userJwt);
    const line = await this.addLineInternal(booking, dto, userJwt);
    await this.reprice(bookingId);
    return { data: line };
  }

  /** List lines (non-deleted) */
  async listLines(bookingId: number): Promise<BookingLine[]> {
    return this.lineRepo.find({
      where: { bookingId, deletedAt: null } as any,
      relations: ['place', 'teacher'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Soft-delete a line and reprice. */
  async removeLine(bookingId: number, lineId: number, userJwt: any): Promise<IApiResponse<boolean>> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const line = await this.lineRepo.findOne({ where: { id: lineId, bookingId } as any, relations: ['place'] });
    if (!line || line.deletedAt) return { data: false, error: 'Line not found' };

    await this.ensureCanMutateForPlace(booking, line.placeId, userJwt);

    await this.lineRepo.update({ id: lineId }, { deletedAt: new Date() } as any);
    await this.reprice(bookingId);
    return { data: true };
  }

  async quote(placeId: number, startAt: string, endAt: string): Promise<IApiResponse<PriceQuote>> {
    const quote = await this.pricing.quoteForSlot(placeId, startAt, endAt);
    return { data: quote };
  }

  async rateCard(placeId: number): Promise<IApiResponse<RateCardResponse>> {
    const card = await this.pricing.getRateCard(placeId);
    return { data: card };
  }

  async initiatePayment(bookingId: number, userJwt: any): Promise<IApiResponse<{ total: number; currency: string | null }>> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.ensureCanMutate(booking, userJwt);

    const lineCount = await this.lineRepo.count({ where: { bookingId, deletedAt: IsNull() } as any });
    if (!lineCount) throw new BadRequestException('Cannot initiate payment for empty booking');

    const totals = await this.reprice(bookingId);

    const pendingId = await this.statusId('pending_payment');
    if (!pendingId) throw new BadRequestException('Missing booking status "pending_payment"');

    const autoHold = new Date(Date.now() + 15 * 60 * 1000);
    const holdExpiresAt = booking.holdExpiresAt && booking.holdExpiresAt > autoHold ? booking.holdExpiresAt : autoHold;

    await this.bookingRepo.update(
      { id: bookingId },
      {
        statusId: pendingId,
        holdExpiresAt,
        paymentReference: null,
        paymentFailureReason: null,
        paidAt: null,
      } as any,
    );

    return totals;
  }

  async markPaymentSuccessful(
    bookingId: number,
    paymentReference: string | undefined,
    userJwt: any,
  ): Promise<IApiResponse<{ total: number; currency: string | null }>> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.ensureCanMutate(booking, userJwt);

    const totals = await this.reprice(bookingId);

    const confirmedId = await this.statusId('confirmed');
    if (!confirmedId) throw new BadRequestException('Missing booking status "confirmed"');

    await this.bookingRepo.update(
      { id: bookingId },
      {
        statusId: confirmedId,
        holdExpiresAt: null,
        paymentReference: paymentReference ?? booking.paymentReference ?? null,
        paymentFailureReason: null,
        paidAt: new Date(),
      } as any,
    );

    return totals;
  }

  async markPaymentFailed(
    bookingId: number,
    paymentReference: string | undefined,
    reason: string | undefined,
    userJwt: any,
  ): Promise<IApiResponse<{ total: number; currency: string | null }>> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.ensureCanMutate(booking, userJwt);

    const totals = await this.reprice(bookingId);

    const failedId = await this.statusId('payment_failed');
    if (!failedId) throw new BadRequestException('Missing booking status "payment_failed"');

    await this.bookingRepo.update(
      { id: bookingId },
      {
        statusId: failedId,
        paymentReference: paymentReference ?? booking.paymentReference ?? null,
        paymentFailureReason: reason ?? null,
        paidAt: null,
      } as any,
    );

    return totals;
  }

  /** Confirm a booking (sets status to 'confirmed', clears hold). */
  async confirm(bookingId: number, userJwt: any): Promise<IApiResponse<boolean>> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.ensureCanMutate(booking, userJwt);

    const lines = await this.listLines(bookingId);
    if (!lines.length) throw new BadRequestException('Cannot confirm an empty booking');

    const confirmedId = await this.statusId('confirmed');
    if (!confirmedId) throw new BadRequestException('Missing booking status "confirmed"');

    await this.bookingRepo.update(
      { id: bookingId },
      { statusId: confirmedId, holdExpiresAt: null, paidAt: booking.paidAt ?? new Date() } as any,
    );
    await this.reprice(bookingId);
    return { data: true };
  }

  /** Cancel a booking (set to a non-active status; fallback to expired hold). */
  async cancel(bookingId: number, userJwt: any): Promise<IApiResponse<boolean>> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.ensureCanMutate(booking, userJwt);

    const cancelledId = await this.statusId('cancelled');
    if (cancelledId) {
      await this.bookingRepo.update(
        { id: bookingId },
        { statusId: cancelledId, holdExpiresAt: null, paidAt: null } as any,
      );
    } else {
      // Fallback: mark as non-active by expiring the hold immediately
      const holdId = (await this.statusId('hold')) ?? (await this.statusId('awaiting_teacher'));
      await this.bookingRepo.update(
        { id: bookingId },
        { statusId: holdId ?? booking.statusId, holdExpiresAt: new Date(0), paidAt: null } as any,
      );
    }
    await this.reprice(bookingId);
    return { data: true };
  }

  /** Force recompute totals from lines. */
  async reprice(bookingId: number): Promise<IApiResponse<{ total: number; currency: string | null }>> {
    const rows = await this['dataSource'].query(
      `SELECT
          COALESCE(SUM(price * qty), 0)::numeric(12,2) AS total,
          COUNT(DISTINCT currency) AS currency_count,
          MIN(currency) AS currency
        FROM booking_lines
        WHERE booking_id = $1 AND deleted_at IS NULL`,
      [bookingId],
    );

    const row = rows?.[0] ?? { total: 0, currency_count: 0, currency: null };
    if (Number(row.currency_count) > 1) {
      throw new BadRequestException('Booking has mixed currencies');
    }

    const total = Number(row.total ?? 0);
    const currency = row.currency ?? null;

    const update: Partial<Booking> = { total };
    if (currency) {
      update.currency = currency;
    }

    await this.bookingRepo.update({ id: bookingId }, update as any);
    return { data: { total, currency } };
  }

  /** ------------------ helpers ------------------ */

  private async addLineInternal(booking: Booking, dto: AddLineDto, userJwt: any): Promise<BookingLine> {
    const slot = this.buildSlotRange(dto.startAt, dto.endAt);
    const quote = await this.pricing.quoteForSlot(dto.placeId, dto.startAt, dto.endAt);
    await this.syncBookingCurrency(booking, quote.currency);

    // DB triggers will validate capacity and teacher/course eligibility. :contentReference[oaicite:3]{index=3}
    const line = this.lineRepo.create({
      bookingId: booking.id,
      placeId: dto.placeId,
      teacherId: dto.teacherId ?? null,
      slot: slot as any,
      qty: dto.qty ?? 1,
      price: quote.unitPrice,
      currency: quote.currency,
      pricingProfileId: quote.pricingProfileId,
      appliedRuleIds: quote.appliedRuleIds.length ? quote.appliedRuleIds.map((id) => Number(id)) : null,
      pricingDetails: quote.pricingDetails,
      courseSessionId: dto.courseSessionId ?? null,
    });
    try {
      const saved = await this.lineRepo.save(line);
      const withRelations = await this.lineRepo.findOne({ where: { id: saved.id } as any, relations: ['place', 'teacher'] });
      return withRelations ?? saved;
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('check_violation')) {
        throw new BadRequestException(msg);
      }
      throw e;
    }
  }

  private async ensureCanMutate(booking: Booking, userJwt: any): Promise<void> {
    const isAdmin = await this.isAdmin(userJwt);
    if (isAdmin) return;

    const me = Number(userJwt?.id);
    if (me && booking.userId === me) return;

    // Facility staff can mutate if any booking line belongs to their facilities
    const facilityIds = await this.getUserFacilityIds(userJwt);
    if (facilityIds.length) {
      const rows = await this['dataSource']
        .createQueryBuilder()
        .select('distinct pl.facility_id', 'fid')
        .from('booking_lines', 'bl')
        .innerJoin('places', 'pl', 'pl.id = bl.place_id')
        .where('bl.booking_id = :bid', { bid: booking.id })
        .andWhere('bl.deleted_at IS NULL')
        .getRawMany<{ fid: string }>();
      const fids = rows.map(r => Number(r.fid));
      if (fids.some(fid => facilityIds.includes(fid))) return;
    }
    throw new UnauthorizedException();
  }

  private async ensureCanMutateForPlace(booking: Booking, placeId: number, userJwt: any): Promise<void> {
    const isAdmin = await this.isAdmin(userJwt);
    if (isAdmin) return;

    const me = Number(userJwt?.id);
    if (me && booking.userId === me) return;

    const place = await this.placeRepo.findOne({ where: { id: placeId } });
    if (!place) throw new BadRequestException('Place not found');

    const myFacilities = await this.getUserFacilityIds(userJwt);
    if (myFacilities.includes(place.facilityId)) return;

    throw new UnauthorizedException();
  }

  private buildSlotRange(startAt: string, endAt: string): string {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid startAt');
    }
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid endAt');
    }
    if (end <= start) {
      throw new BadRequestException('endAt must be after startAt');
    }
    return `[${start.toISOString()}, ${end.toISOString()})`;
  }

  private async syncBookingCurrency(booking: Booking, currency: string): Promise<void> {
    const normalized = (currency || 'AED').toUpperCase();
    const current = (booking.currency || '').toUpperCase();

    if (!current) {
      await this.bookingRepo.update({ id: booking.id }, { currency: normalized } as any);
      booking.currency = normalized as any;
      return;
    }

    if (current === normalized) {
      if (booking.currency !== normalized) {
        booking.currency = normalized as any;
      }
      return;
    }

    const existingLines = await this.lineRepo.count({
      where: { bookingId: booking.id, deletedAt: IsNull() } as any,
    });
    if (existingLines > 0) {
      throw new BadRequestException('Cannot mix currencies within a booking');
    }

    await this.bookingRepo.update({ id: booking.id }, { currency: normalized } as any);
    booking.currency = normalized as any;
  }

}
