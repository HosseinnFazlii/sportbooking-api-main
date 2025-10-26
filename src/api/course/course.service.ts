import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { BaseService } from '../../common/base.service';
import { Course } from '../../entities/course';
import { CourseSession } from '../../entities/courseSession';
import { CourseImage } from '../../entities/courseImage';
import { Place } from '../../entities/place';
import { VCourse } from '../../entities/vCourse';
import { CreateCourseSessionDto } from './dto/create-course-session.dto';
import { IApiResponse } from '../../types/response';

@Injectable()
export class CourseService extends BaseService<Course, VCourse> {
  constructor(
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(CourseSession) private readonly sessionRepo: Repository<CourseSession>,
    @InjectRepository(CourseImage) private readonly imageRepo: Repository<CourseImage>,
    @InjectRepository(Place) private readonly placeRepo: Repository<Place>,
    @InjectRepository(VCourse) vCourseRepo: Repository<VCourse>,
    dataSource: DataSource,
  ) {
    super(courseRepo, dataSource, {
      searchableColumns: ['title', 'sportName', 'createdByName'],
      defaultSort: '-createdAt',
      // userScope is OFF for courses; facility scope is handled via overridden applyAccessControl()
      list: { repo: vCourseRepo, alias: 'vc' },
    });
  }

  /** Facility scoping for courses: join sessions -> place -> facility_id */
  protected override async applyAccessControl<E = Course>(
    qb: SelectQueryBuilder<E>,
    user?: any,
  ): Promise<SelectQueryBuilder<E>> {
    qb = await super.applyAccessControl(qb, user);

    // If user is facility staff, limit to courses that have sessions in their facilities
    if (!(await this.isAdmin(user))) {
      const facilityIds = await this.getUserFacilityIds(user);
      if (facilityIds.length) {
        qb.leftJoin(`${this.alias}.sessions`, 'cs')
          .leftJoin('cs.place', 'pl')
          .andWhere('pl.facilityId IN (:...facilityIds)', { facilityIds })
          .distinct(true);
      }
    }
    return qb;
  }

  /** List sessions of a course */
  async listSessions(courseId: number): Promise<CourseSession[]> {
    return this.sessionRepo.find({
      where: { courseId },
      relations: ['teacher', 'place', 'course'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Create a session under a course (DB will enforce capacity, hours, teacher eligibility) */
  async createSession(courseId: number, dto: CreateCourseSessionDto, user?: any): Promise<IApiResponse<CourseSession>> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course || (course as any).deletedAt) {
      throw new BadRequestException('Course not found');
    }

    // Facility scope: if user is facility staff, session place must belong to their facilities
    const place = await this.placeRepo.findOne({ where: { id: dto.placeId } });
    if (!place) throw new BadRequestException('Place not found');

    const facilityIds = await this.getUserFacilityIds(user);
    if (facilityIds.length && !facilityIds.includes(place.facilityId)) {
      throw new BadRequestException('You are not allowed to add sessions to this facility');
    }

    // Build tstzrange '[start,end)' as string
    const startIso = new Date(dto.startAt).toISOString();
    const endIso = new Date(dto.endAt).toISOString();
    if (new Date(endIso) <= new Date(startIso)) {
      throw new BadRequestException('endAt must be after startAt');
    }
    const slot = `[${startIso}, ${endIso})`;

    const ses = this.sessionRepo.create({
      courseId,
      teacherId: dto.teacherId,
      placeId: dto.placeId,
      slot: slot as any,
      price: dto.price,
      maxCapacity: dto.maxCapacity ?? 10,
    });

    // Triggers: check_within_place_hours, enforce_place_capacity, enforce_teacher_and_course
    // will validate slot/hours/capacity/teacher. :contentReference[oaicite:2]{index=2}
    const saved = await this.sessionRepo.save(ses);
    return { data: saved };
  }

  /** Simple image attach helper (optional) */
  async addImage(courseId: number, url: string, sort = 0): Promise<IApiResponse<CourseImage>> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new BadRequestException('Course not found');
    const img = await this.imageRepo.save(this.imageRepo.create({ courseId, url, sortOrder: sort }));
    return { data: img };
  }

  async listImages(courseId: number) {
    return this.imageRepo.find({ where: { courseId }, order: { sortOrder: 'ASC' } as any });
  }

  async removeImage(courseId: number, imageId: number) {
    const img = await this.imageRepo.findOne({ where: { id: imageId, courseId } as any });
    if (!img) return { data: false, error: 'Image not found' };
    await this.imageRepo.delete({ id: imageId });
    return { data: true };
  }
}
