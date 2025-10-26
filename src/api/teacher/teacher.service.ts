import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BaseService } from '../../common/base.service';
import { User } from '../../entities/user';
import { TeacherProfile } from '../../entities/teacherProfile';
import { TeacherSport } from '../../entities/teacherSport';
import { TeacherCity } from '../../entities/teacherCity';
import { TeacherWorkingHour } from '../../entities/teacherWorkingHour';
import { Place } from '../../entities/place';
import { UpdateTeacherProfileDto } from './dto/update-profile.dto';
import { AssignCityDto } from './dto/assign-city.dto';
import { AssignSportDto } from './dto/assign-sport.dto';
import { UpsertWorkingHourDto } from './dto/upsert-working-hour.dto';

@Injectable()
export class TeacherService extends BaseService<TeacherProfile> {
  constructor(
    @InjectRepository(TeacherProfile) private readonly profileRepo: Repository<TeacherProfile>,
    @InjectRepository(TeacherSport) private readonly sportRepo: Repository<TeacherSport>,
    @InjectRepository(TeacherCity) private readonly cityRepo: Repository<TeacherCity>,
    @InjectRepository(TeacherWorkingHour) private readonly hourRepo: Repository<TeacherWorkingHour>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Place) private readonly placeRepo: Repository<Place>,
    dataSource: DataSource,
  ) {
    super(profileRepo, dataSource, {
      searchableColumns: [], // profile table is thin
      defaultSort: '-createdAt',
    });
  }

  /** List teachers (users having a teacher_profile). Optional filters: sportId, cityId */
  async listTeachers(query: { sportId?: number; cityId?: number }) {
    const qb = this['dataSource'].createQueryBuilder()
      .select([
        'u.id AS "id"',
        'u.name AS "name"',
        'u.picture AS "picture"',
        'tp.hourly_rate AS "hourlyRate"',
        'tp.rating_avg AS "ratingAvg"',
        'tp.rating_count AS "ratingCount"',
      ])
      .from('teacher_profiles', 'tp')
      .innerJoin('users', 'u', 'u.id = tp.user_id AND u.deleted_at IS NULL AND u.is_active = true');

    if (query.sportId) {
      qb.innerJoin('teacher_sports', 'ts', 'ts.teacher_id = tp.user_id AND ts.sport_id = :sid', { sid: query.sportId });
    }
    if (query.cityId) {
      qb.innerJoin('teacher_cities', 'tc', 'tc.teacher_id = tp.user_id AND tc.city_id = :cid', { cid: query.cityId });
    }
    qb.orderBy('"ratingAvg"', 'DESC');

    const rows = await qb.getRawMany();
    return rows.map((row: any) => ({
      ...row,
      picture: this.pictureToBase64(row.picture),
    }));
  }

  /** Teacher self or admin can update the profile */
  async updateProfile(teacherId: number, dto: UpdateTeacherProfileDto, requester: any) {
    await this.ensureTeacherAccess(teacherId, requester);
    const profile = await this.profileRepo.findOne({ where: { userId: teacherId } });
    if (!profile) {
      // auto-create profile if missing
      await this.profileRepo.save(this.profileRepo.create({ userId: teacherId, ...dto }));
    } else {
      await this.profileRepo.update({ userId: teacherId }, dto as any);
    }
    return this.profileRepo.findOne({ where: { userId: teacherId } });
  }

  /** Sports */
  async listSports(teacherId: number) {
    return this.sportRepo.find({ where: { teacherId } });
  }
  async addSport(teacherId: number, dto: AssignSportDto, requester: any) {
    await this.ensureTeacherAccess(teacherId, requester);
    try {
      await this.sportRepo.save(this.sportRepo.create({ teacherId, sportId: dto.sportId }));
      return true;
    } catch {
      return true; // duplicate PK(teacher_id,sport_id) is idempotent
    }
  }
  async removeSport(teacherId: number, sportId: number, requester: any) {
    await this.ensureTeacherAccess(teacherId, requester);
    await this.sportRepo.delete({ teacherId, sportId });
    return true;
  }

  /** Cities */
  async listCities(teacherId: number) {
    return this.cityRepo.find({ where: { teacherId } });
  }
  async addCity(teacherId: number, dto: AssignCityDto, requester: any) {
    await this.ensureTeacherAccess(teacherId, requester);
    try {
      await this.cityRepo.save(this.cityRepo.create({ teacherId, cityId: dto.cityId }));
      return true;
    } catch {
      return true;
    }
  }
  async removeCity(teacherId: number, cityId: number, requester: any) {
    await this.ensureTeacherAccess(teacherId, requester);
    await this.cityRepo.delete({ teacherId, cityId });
    return true;
  }

  /** Working hours (unique per (teacher, weekday, segment_no))  */
  async listWorkingHours(teacherId: number) {
    return this.hourRepo.find({ where: { teacherId }, order: { weekday: 'ASC', segmentNo: 'ASC' } as any });
  }
  async upsertWorkingHour(teacherId: number, dto: UpsertWorkingHourDto, requester: any) {
    await this.ensureTeacherAccess(teacherId, requester);
    if (dto.openTime >= dto.closeTime && !dto.isClosed) {
      throw new BadRequestException('openTime must be before closeTime');
    }
    const existing = await this.hourRepo.findOne({ where: { teacherId, weekday: dto.weekday, segmentNo: dto.segmentNo } as any });
    if (existing) {
      await this.hourRepo.update({ id: existing.id }, {
        openTime: dto.openTime, closeTime: dto.closeTime, isClosed: dto.isClosed,
      } as any);
      return this.hourRepo.findOne({ where: { id: existing.id } });
    }
    const created = await this.hourRepo.save(this.hourRepo.create({ teacherId, ...dto } as any));
    return created;
  }
  async deleteWorkingHour(teacherId: number, weekday: number, segmentNo: number, requester: any) {
    await this.ensureTeacherAccess(teacherId, requester);
    await this.hourRepo.delete({ teacherId, weekday, segmentNo } as any);
    return true;
  }

  /** Availability search: eligible + not overlapped + optional sport match */
  async availableTeachers(params: { placeId: number; startAt: string; endAt: string; sportId?: number }, requester: any) {
    const place = await this.placeRepo.findOne({ where: { id: params.placeId } });
    if (!place) throw new NotFoundException('Place not found');

    // Facility managers can only query within their facilities
    const facilityIds = await this.getUserFacilityIds(requester);
    if (facilityIds.length && !facilityIds.includes(place.facilityId)) {
      throw new UnauthorizedException();
    }

    const startIso = new Date(params.startAt).toISOString();
    const endIso = new Date(params.endAt).toISOString();
    if (new Date(endIso) <= new Date(startIso)) throw new BadRequestException('endAt must be after startAt');
    const slot = `[${startIso}, ${endIso})`;

    const sportFilter = params.sportId
      ? 'AND EXISTS (SELECT 1 FROM teacher_sports ts WHERE ts.teacher_id = u.id AND ts.sport_id = :sportId)'
      : '';

    // check_teacher_eligibility() + no overlap with active bookings; matches your triggers. :contentReference[oaicite:8]{index=8} :contentReference[oaicite:9]{index=9}
    const rows = await this['dataSource'].query(
      `
      SELECT u.id, u.name AS "name", u.picture AS "picture",
             tp.hourly_rate AS "hourlyRate", tp.rating_avg AS "ratingAvg", tp.rating_count AS "ratingCount"
        FROM teacher_profiles tp
        JOIN users u ON u.id = tp.user_id AND u.deleted_at IS NULL AND u.is_active = true
       WHERE check_teacher_eligibility(u.id, $1, $2)
         ${sportFilter.replace(':sportId', '$3')}
         AND NOT EXISTS (
           SELECT 1
             FROM booking_lines bl
             JOIN bookings b ON b.id = bl.booking_id
            WHERE bl.teacher_id = u.id
              AND bl.slot && $2
              AND booking_is_active(b.status_id, b.hold_expires_at)
         )
       ORDER BY "ratingAvg" DESC NULLS LAST, "hourlyRate" ASC NULLS LAST
      `,
      params.sportId ? [params.placeId, slot, params.sportId] : [params.placeId, slot],
    );
    return rows.map((row: any) => ({
      ...row,
      picture: this.pictureToBase64(row.picture),
    }));
  }

  /** Access helper: admin or the teacher themself */
  private async ensureTeacherAccess(teacherId: number, requester: any) {
    if (await this.isAdmin(requester)) return;
    if (Number(requester?.id) === Number(teacherId)) return;
    throw new UnauthorizedException();
  }

  private pictureToBase64(picture: any): string | null {
    if (!picture) return null;
    if (typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function' && Buffer.isBuffer(picture)) {
      return picture.toString('base64');
    }
    if (picture instanceof Uint8Array) {
      return Buffer.from(picture).toString('base64');
    }
    return typeof picture === 'string' ? picture : null;
  }
}
