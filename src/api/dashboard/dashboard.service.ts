import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  SelectQueryBuilder,
  Brackets,
} from 'typeorm';

import { IDashboardData, IKpis, ILabelCount, IActivityRecord } from './types';

import { Booking } from '../../entities/booking';
import { BookingLine } from '../../entities/bookingLine';
import { BookingStatus } from '../../entities/bookingStatus';
import { Place } from '../../entities/place';
import { Facility } from '../../entities/facility';
import { Sport } from '../../entities/sport';
import { Course } from '../../entities/course';
import { CourseSession } from '../../entities/courseSession';
import { Tournament } from '../../entities/tournament';
import { TeacherProfile } from '../../entities/teacherProfile';
import { FacilityStaff } from '../../entities/facilityStaff';

import { Log } from '../../entities/log';
import { LogType } from '../../entities/logType';

// Optional helpers if present
import { Calendar } from '../../entities/calendar'; // Persian calendar dimension (if you ship it)

// Your User entity uses id (new project)
import { User } from '../../entities/user';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lineRepo: Repository<BookingLine>,
    @InjectRepository(BookingStatus) private readonly statusRepo: Repository<BookingStatus>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(CourseSession) private readonly courseSessionRepo: Repository<CourseSession>,
    @InjectRepository(Tournament) private readonly tournamentRepo: Repository<Tournament>,
    @InjectRepository(Place) private readonly placeRepo: Repository<Place>,
    @InjectRepository(Facility) private readonly facilityRepo: Repository<Facility>,
    @InjectRepository(Sport) private readonly sportRepo: Repository<Sport>,
    @InjectRepository(TeacherProfile) private readonly teacherProfRepo: Repository<TeacherProfile>,
    @InjectRepository(FacilityStaff) private readonly staffRepo: Repository<FacilityStaff>,
    @InjectRepository(Log) private readonly logRepo: Repository<Log>,
    @InjectRepository(LogType) private readonly logTypeRepo: Repository<LogType>,
    // Calendar is optional; if you don't use it, monthly Persian series is omitted
    @InjectRepository(Calendar) private readonly calRepo: Repository<Calendar>,
  ) { }

  /** Determine scope filters for the current user */
  private async getScope(user: User): Promise<{
    isAdmin: boolean;
    facilityIds: number[];
    teacherId?: number | null;
    userId: number;
  }> {
    const userId = (user as any).id ?? (user as any).userId;

    // Admin check: by role name or id (adjust as needed)
    const collectedNames = new Set<string>();
    const runtimeRoles = (user as any).roles ?? [];
    runtimeRoles.forEach((r: any) => {
      if (r?.name) collectedNames.add(String(r.name));
    });
    const directRoleName = (user as any).role?.name ?? (user as any).roleName;
    if (directRoleName) collectedNames.add(String(directRoleName));

    const isAdmin = Array.from(collectedNames).some((name) => name?.toLowerCase() === 'admin')
      || ((user as any).roleId ?? (user as any).role?.id) === 1;

    // Facilities where user is staff
    const staff = await this.staffRepo.find({ where: { userId } });
    const facilityIds = staff.map((s: any) => s.facilityId);

    // Teacher id if user is a teacher
    const prof = await this.teacherProfRepo.findOne({ where: { userId } });
    const teacherId = prof?.userId ?? null;

    return { isAdmin, facilityIds, teacherId, userId };
  }

  /** Apply scoping on a BookingLine query */
  private applyScopeToLineQb(qb: SelectQueryBuilder<BookingLine>, scope: Awaited<ReturnType<typeof this.getScope>>) {
    const { isAdmin, facilityIds, teacherId, userId } = scope;

    // Join booking + place + facility once
    // qb.innerJoin('booking_line.booking', 'b')
    qb.innerJoin(Place, 'p', 'booking_line.place_id = p.id') // adjust to p.place_id if needed
      .innerJoin(Facility, 'f', 'p.facility_id = f.id');

    if (isAdmin) return qb;

    return qb.andWhere(
      new Brackets((sq) => {
        // Facility manager: has staff facilities
        if (facilityIds.length) sq.orWhere('f.id IN (:...facIds)', { facIds: facilityIds });
        // Teacher: any line with their teacherId
        if (teacherId) sq.orWhere('booking_line.teacher_id = :tid', { tid: teacherId });
        // End user: bookings created by them
        sq.orWhere('b.userId = :uid', { uid: userId });
      }),
    );
  }

  /** Apply scoping on a Booking (header) query */
  private applyScopeToBookingQb(qb: SelectQueryBuilder<Booking>, scope: Awaited<ReturnType<typeof this.getScope>>) {
    const { isAdmin, facilityIds, teacherId, userId } = scope;

    // join line, place, facility to scope by facility/teacher
    qb.leftJoin(BookingLine, 'bl', 'bl.bookingId = booking.id')
      .leftJoin(Place, 'p', 'bl.place_id = p.id')
      .leftJoin(Facility, 'f', 'p.facility_id = f.id');

    if (isAdmin) return qb;

    return qb.andWhere(
      new Brackets((sq) => {
        if (facilityIds.length) sq.orWhere('f.id IN (:...facIds)', { facIds: facilityIds });
        if (teacherId) sq.orWhere('bl.teacher_id = :tid', { tid: teacherId });
        sq.orWhere('booking.userId = :uid', { uid: userId });
      }),
    );
  }

  /** Apply scoping to CourseSession (joins place->facility; restrict by fac or teacher) */
  private applyScopeToCourseSessionQb(qb: SelectQueryBuilder<CourseSession>, scope: Awaited<ReturnType<typeof this.getScope>>) {
    const { isAdmin, facilityIds, teacherId } = scope;
    qb.innerJoin(Place, 'p', 'cs."place_id" = p."id"')
      .innerJoin(Facility, 'f', 'p."facility_id" = f."id"');
    if (isAdmin) return qb;
    return qb.andWhere(
      new Brackets((sq) => {
        if (facilityIds.length) sq.orWhere('f."id" IN (:...facIds)', { facIds: facilityIds });
        if (teacherId) sq.orWhere('cs."teacher_id" = :tid', { tid: teacherId });
      }),
    );
  }

  /** Apply scoping to Tournament (facility-based) */
  private applyScopeToTournamentQb(qb: SelectQueryBuilder<Tournament>, scope: Awaited<ReturnType<typeof this.getScope>>) {
    const { isAdmin, facilityIds } = scope;
    if (isAdmin) return qb;
    if (!facilityIds.length) return qb.andWhere('1=0'); // non-admins without facilities see none
    return qb.andWhere('t."facility_id" IN (:...facIds)', { facIds: facilityIds });
  }


  /** Get "Confirmed" bookingStatus ids (by name, case-insensitive) */
  private async getConfirmedStatusIds(): Promise<number[]> {
    const rows = await this.statusRepo
      .createQueryBuilder('s')
      .select('s.id', 'id') // if your PK is bookingStatusId, switch here
      .where('LOWER(s.code) IN (:...codes)', { codes: ['confirmed', 'paid', 'active'] }) // cover variants

      .getRawMany<{ id: number }>();

    return rows.map((r) => r.id);
  }

  /** Generic helper to fetch status ids by codes (lowercased) */
  private async getStatusIdsByNames(codes: string[]): Promise<number[]> {
    const rows = await this.statusRepo
      .createQueryBuilder('s')
      .select('s.id', 'id') // adjust if needed
      .where('LOWER(s.code) IN (:...code)', { code: codes.map((n) => n.toLowerCase()) })
      .getRawMany<{ id: number }>();
    return rows.map((r) => r.id);
  }


  private startOfMonth(): Date {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
  }

  private startOfYear(year?: number): Date {
    const y = year ?? new Date().getUTCFullYear();
    return new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
  }

  private startOfDay(): Date {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }

  /** KPIs (counts: distinct bookings; revenue: sum of line prices for confirmed bookings) */
  private async kpis(scope: Awaited<ReturnType<typeof this.getScope>>): Promise<IKpis> {
    const confirmedIds = await this.getConfirmedStatusIds();
    const activeIds = await this.getStatusIdsByNames(['hold', 'pending', 'confirmed', 'paid', 'active']);
    const cancelledIds = await this.getStatusIdsByNames(['cancelled', 'canceled']);

    // Bookings today
    const today = this.startOfDay();
    const bookingsToday = await this.applyScopeToBookingQb(
      this.bookingRepo.createQueryBuilder('booking')
        .where('booking.createdAt >= :from', { from: today }),
      scope,
    ).getCount();

    // Bookings this month
    const monthStart = this.startOfMonth();
    const bookingsThisMonth = await this.applyScopeToBookingQb(
      this.bookingRepo.createQueryBuilder('booking')
        .where('booking.createdAt >= :from', { from: monthStart }),
      scope,
    ).getCount();

    // Bookings this year
    const yearStart = this.startOfYear();
    const bookingsThisYear = await this.applyScopeToBookingQb(
      this.bookingRepo.createQueryBuilder('booking')
        .where('booking.createdAt >= :from', { from: yearStart }),
      scope,
    ).getCount();

    // Revenue this month (sum of line.price for confirmed bookings)
    const revenueThisMonthRow = await this.applyScopeToLineQb(
      this.lineRepo.createQueryBuilder('booking_line')
        .innerJoin('booking_line.booking', 'b')
        .where('b.createdAt >= :from', { from: monthStart })
        .andWhere(confirmedIds.length ? 'b.statusId IN (:...cids)' : '1=1', { cids: confirmedIds }),
      scope,
    )
      .select('COALESCE(SUM(booking_line.price), 0)', 'sum')
      .getRawOne<{ sum: string }>();

    const revenueThisMonth = Number(revenueThisMonthRow?.sum ?? 0);

    // 1) Total Bookings (distinct)
    const totalBookings = await this.applyScopeToBookingQb(
      this.bookingRepo.createQueryBuilder('booking'),
      scope,
    ).getCount();

    // 2) Future bookings not done yet:
    //    Any booking with at least one line starting in the future and status in "activeIds"
    const upcomingRow = await this.applyScopeToLineQb(
      this.lineRepo.createQueryBuilder('booking_line')
        .innerJoin('booking_line.booking', 'b')
        .where('b.statusId IN (:...sids)', { sids: activeIds })
        .andWhere('LOWER(booking_line.slot) > NOW()'),
      scope,
    )
      .select('COUNT(DISTINCT b.id)', 'cnt')
      .getRawOne<{ cnt: string }>();
    const upcomingBookings = Number(upcomingRow?.cnt ?? 0);

    // 3) Past bookings done:
    //    Bookings in confirmedIds where NO line ends in the future (i.e., all lines ended)
    const pastDoneBookings = await this.applyScopeToBookingQb(
      this.bookingRepo.createQueryBuilder('booking')
        .where(confirmedIds.length ? 'booking.statusId IN (:...cids)' : '1=1', { cids: confirmedIds })
        .andWhere(`NOT EXISTS (
          SELECT 1 FROM "booking_lines" bl2
          WHERE bl2."booking_id" = booking."id"
            AND UPPER(bl2."slot") > NOW()
        )`),
      scope,
    ).getCount();

    // 4) Cancelled bookings
    const cancelledBookings = await this.applyScopeToBookingQb(
      this.bookingRepo.createQueryBuilder('booking')
        .where(cancelledIds.length ? 'booking.statusId IN (:...xids)' : '1=0', { xids: cancelledIds }),
      scope,
    ).getCount();

    // 5) Current courses (sessions running now) — count DISTINCT courseId
    const currentCoursesRow = await this.applyScopeToCourseSessionQb(
      this.courseSessionRepo.createQueryBuilder('cs')
        .where('LOWER(cs.slot) > NOW()'),
      scope,
    )
      .select('COUNT(DISTINCT cs."id")', 'cnt')
      .getRawOne<{ cnt: string }>();
    const currentCourses = Number(currentCoursesRow?.cnt ?? 0);

    // 6) Current tournaments (t.start_at <= now < t.endAt)
    const currentTournaments = await this.applyScopeToTournamentQb(
      this.tournamentRepo.createQueryBuilder('t')
        .where('t."start_at" <= NOW() AND t."end_at" > NOW()'),
      scope,
    ).getCount();

    // 7) Total courses (distinct under scope)
    const totalCoursesRow = await this.applyScopeToCourseSessionQb(
      this.courseSessionRepo.createQueryBuilder('cs'),
      scope,
    )
      .select('COUNT(DISTINCT cs."id")', 'cnt')
      .getRawOne<{ cnt: string }>();
    const totalCourses = Number(totalCoursesRow?.cnt ?? 0);

    // 8) Total tournaments (under scope)
    const totalTournaments = await this.applyScopeToTournamentQb(
      this.tournamentRepo.createQueryBuilder('t'),
      scope,
    ).getCount();

    return {
      bookingsToday,
      bookingsThisMonth,
      bookingsThisYear,
      revenueThisMonth,
      totalBookings,
      upcomingBookings,
      pastDoneBookings,
      cancelledBookings,
      currentCourses,
      currentTournaments,
      totalCourses,
      totalTournaments,
    };
  }

  /** Count bookings by status (name) since start of year */
  private async byStatus(scope: Awaited<ReturnType<typeof this.getScope>>, year?: number): Promise<ILabelCount[]> {
    const from = this.startOfYear(year);

    const rows = await this.applyScopeToBookingQb(
      this.bookingRepo.createQueryBuilder('booking')
        .innerJoin(BookingStatus, 's', 'booking.statusId = s.id')
        .where('booking.createdAt >= :from', { from }),
      scope,
    )
      .select('LOWER(s.code)', 'label')
      .addSelect('COUNT(DISTINCT booking.id)', 'count')
      .groupBy('LOWER(s.code)')
      .orderBy('COUNT(DISTINCT booking.id)', 'DESC')
      .getRawMany<{ label: string; count: string }>();

    return rows.map((r) => ({ label: r.label, count: Number(r.count) }));
  }

  /** Count bookings by facility (since start of year) */
  private async byFacility(scope: Awaited<ReturnType<typeof this.getScope>>, year?: number): Promise<ILabelCount[]> {
    const from = this.startOfYear(year);

    const rows = await this.applyScopeToLineQb(
      this.lineRepo.createQueryBuilder('booking_line')
        .innerJoin('booking_line.booking', 'b')
        .where('b.createdAt >= :from', { from }),
      scope,
    )
      .select('f.name', 'label')
      .addSelect('COUNT(DISTINCT b.id)', 'count')
      .groupBy('f.name')
      .orderBy('COUNT(DISTINCT b.id)', 'DESC')
      .getRawMany<{ label: string; count: string }>();

    return rows.map((r) => ({ label: r.label ?? '—', count: Number(r.count) }));
  }

  /** Count bookings by sport (based on place.sportId) */
  private async bySport(scope: Awaited<ReturnType<typeof this.getScope>>, year?: number): Promise<ILabelCount[]> {
    const from = this.startOfYear(year);

    const rows = await this.applyScopeToLineQb(
      this.lineRepo.createQueryBuilder('booking_line')
        .innerJoin('booking_line.booking', 'b')
        .leftJoin(Place, 'p1', 'booking_line.place_id = p1.id')
        .leftJoin(Sport, 'sp', 'p1.sportId = sp.id')
        .where('b.createdAt >= :from', { from }),
      scope,
    )
      .select('COALESCE(sp.name, \'Unknown\')', 'label')
      .addSelect('COUNT(DISTINCT b.id)', 'count')
      .groupBy('COALESCE(sp.name, \'Unknown\')')
      .orderBy('COUNT(DISTINCT b.id)', 'DESC')
      .getRawMany<{ label: string; count: string }>();

    return rows.map((r) => ({ label: r.label, count: Number(r.count) }));
  }

  /** Monthly counts (Gregorian); index 0..11 => Jan..Dec for selected year */
  private async monthlyCountsGregorian(scope: Awaited<ReturnType<typeof this.getScope>>, year?: number): Promise<number[]> {
    const y = year ?? new Date().getUTCFullYear();
    const from = new Date(Date.UTC(y, 0, 1));
    const to = new Date(Date.UTC(y + 1, 0, 1));

    const rows = await this.applyScopeToBookingQb(
      this.bookingRepo.createQueryBuilder('booking')
        .where('booking.createdAt >= :from AND booking.createdAt < :to', { from, to }),
      scope,
    )
      .select("EXTRACT(MONTH FROM booking.createdAt)::int", 'm')
      .addSelect('COUNT(DISTINCT booking.id)', 'c')
      .groupBy("EXTRACT(MONTH FROM booking.createdAt)")
      .orderBy('m', 'ASC')
      .getRawMany<{ m: number; c: string }>();

    const arr = Array.from({ length: 12 }, () => 0);
    for (const r of rows) {
      const idx = Number(r.m) - 1;
      if (idx >= 0 && idx < 12) arr[idx] = Number(r.c);
    }
    return arr;
  }

  /** Monthly counts (Persian) if Calendar table is present (bookings by created date) */
  private async monthlyCountsPersian(scope: Awaited<ReturnType<typeof this.getScope>>, persianYear?: number): Promise<number[] | undefined> {
    // If you don't use the Calendar table, just return undefined.
    if (!this.calRepo?.metadata) return undefined;

    // Determine current Persian year if not provided: we can map via today's Gregorian date from Calendar
    const today = new Date();
    const todayRow = await this.calRepo.createQueryBuilder('cal')
      .where('cal."gregorian_date" = :g', { g: today.toISOString().slice(0, 10) }) // yyyy-mm-dd
      .getOne();

    const py = persianYear ?? todayRow?.persianYear ?? undefined;
    if (!py) return undefined;

    const rows = await this.applyScopeToBookingQb(
      this.bookingRepo.createQueryBuilder('booking')
        .leftJoin(Calendar, 'cal', 'CAST(booking."createdAt" AS date) = cal."gregorian_date"')
        .where('cal."PersianYearInt" = :py', { py }),
      scope,
    )
      .select('cal."PersianMonthNo"', 'pm')
      .addSelect('COUNT(DISTINCT booking.id)', 'c')
      .groupBy('cal."PersianMonthNo"')
      .orderBy('cal."PersianMonthNo"', 'ASC')
      .getRawMany<{ pm: number; c: string }>();

    const arr = Array.from({ length: 12 }, () => 0);
    for (const r of rows) {
      const idx = Number(r.pm) - 1;
      if (idx >= 0 && idx < 12) arr[idx] = Number(r.c);
    }
    return arr;
  }

  /** Top teachers this month by # of booking lines */
  private async topTeachersThisMonth(scope: Awaited<ReturnType<typeof this.getScope>>, limit = 5): Promise<ILabelCount[]> {
    const from = this.startOfMonth();

    const rows = await this.applyScopeToLineQb(
      this.lineRepo.createQueryBuilder('booking_line')
        .innerJoin('booking_line.booking', 'b')
        .where('b.createdAt >= :from', { from })
        .andWhere('booking_line.teacher_id IS NOT NULL'),
      scope,
    )
      .select('booking_line.teacher_id', 'tid')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('booking_line.teacher_id')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany<{ tid: number; cnt: string }>();

    // Map teacherId -> readable label (you may have a Teacher entity/name)
    // If you have a teacher view/entity with name, join that instead. For now, just “Teacher #ID”.
    return rows.map((r) => ({
      label: `Teacher #${r.tid}`,
      count: Number(r.cnt),
    }));
  }

  /** Recent activities: last 10 logs by this user, excluding API_ACCESS */
  async getActivityData(user: User): Promise<IActivityRecord[]> {
    const userId = (user as any).id ?? (user as any).userId;

    const lq = this.logRepo.createQueryBuilder('l')
      .leftJoin(LogType, 'lt', 'lt."id" = l."type_id"')
      .where('l."created_by" = :uid', { uid: userId })
      .andWhere('LOWER(lt."code") <> :code', { code: 'api_access' })
      .orderBy('l."created_at"', 'DESC')
      .take(10);

    const rows = await lq.getRawMany<{
      l_text1: string;
      l_text2: string | null;
      l_createdat: Date;
      lt_code: string;
    }>();

    return rows.map((r) => ({
      title: r.lt_code ?? 'LOG',
      subtitle: r.l_text1 ?? r.l_text2 ?? null,
      date: r.l_createdat,
    }));
  }

  /** Main aggregator */
  async getDashboardData(user: User, year?: number): Promise<IDashboardData> {
    const scope = await this.getScope(user);
    try {
      const [kpis, byStatus, byFacility, bySport, monthlyG, monthlyP, topTeachers, activities] =
        await Promise.all([
          this.kpis(scope),
          this.byStatus(scope, year),
          this.byFacility(scope, year),
          this.bySport(scope, year),
          this.monthlyCountsGregorian(scope, year),
          this.monthlyCountsPersian(scope, undefined), // set year explicitly if you want
          this.topTeachersThisMonth(scope, 5),
          this.getActivityData(user),
        ]);

      return {
        kpis,
        byStatus,
        byFacility,
        bySport,
        monthlyCountsGregorian: monthlyG,
        monthlyCountsPersian: monthlyP, // may be undefined if Calendar not used
        topTeachersThisMonth: topTeachers,
        lastActivities: activities,
      };
    } catch (ex) {
      console.error(ex);
      return null;
    }
  }
}
