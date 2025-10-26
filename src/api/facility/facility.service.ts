import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder, DeepPartial } from 'typeorm';
import { BaseService } from '../../common/base.service';
import { Facility } from '../../entities/facility';
import { Place } from '../../entities/place';
import { PlaceWorkingHour } from '../../entities/placeWorkingHour';
import { FacilityStaff } from '../../entities/facilityStaff';
import { User } from '../../entities/user';
import { PlacePricingProfile } from '../../entities/placePricingProfile';
import { PlacePriceRule } from '../../entities/placePriceRule';
import { VFacility } from '../../entities/vFacility';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { UpsertPlaceHoursDto } from './dto/upsert-place-hours.dto';
import { AddStaffDto } from './dto/add-staff.dto';
import { CreatePricingProfileDto } from './dto/create-pricing-profile.dto';
import { UpdatePricingProfileDto } from './dto/update-pricing-profile.dto';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';

@Injectable()
export class FacilityService extends BaseService<Facility, VFacility> {
  constructor(
    @InjectRepository(Facility) private readonly facRepo: Repository<Facility>,
    @InjectRepository(Place) private readonly placeRepo: Repository<Place>,
    @InjectRepository(PlaceWorkingHour) private readonly hoursRepo: Repository<PlaceWorkingHour>,
    @InjectRepository(FacilityStaff) private readonly staffRepo: Repository<FacilityStaff>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PlacePricingProfile) private readonly profileRepo: Repository<PlacePricingProfile>,
    @InjectRepository(PlacePriceRule) private readonly ruleRepo: Repository<PlacePriceRule>,
    @InjectRepository(VFacility) vFacilityRepo: Repository<VFacility>,
    dataSource: DataSource,
  ) {
    super(facRepo, dataSource, {
      searchableColumns: ['name', 'slug', 'city', 'state', 'country'],
      defaultSort: '+name',
      // facilityScope not needed; entity is the facility itself
      list: { repo: vFacilityRepo, alias: 'vf' },
    });
  }

  /** Managers see only their facilities (admins see all). */
  protected override async applyAccessControl<E = Facility>(qb: SelectQueryBuilder<E>, user?: any) {
    qb = await super.applyAccessControl(qb, user);
    if (!(await this.isAdmin(user))) {
      const ids = await this.getUserFacilityIds(user);
      if (!ids.length) return qb.andWhere('1=0');
      qb.andWhere(`${this.alias}.id IN (:...fids)`, { fids: ids });
    }
    return qb;
  }

  /** Places */
  async listPlaces(facilityId: number, requester?: any) {
    await this.ensureFacilityAccess(facilityId, requester);
    return this.placeRepo.find({ where: { facilityId, deletedAt: null } as any, order: { name: 'ASC' } as any });
    // uniqueness (facility_id, name) where deleted_at is null enforced in DB. :contentReference[oaicite:10]{index=10}
  }

  async createPlace(facilityId: number, dto: CreatePlaceDto, requester: any) {
    await this.ensureFacilityAccess(facilityId, requester);
    if (dto.minCapacity > dto.maxCapacity) throw new BadRequestException('minCapacity must be <= maxCapacity'); // DB check too. :contentReference[oaicite:11]{index=11}
    const place = this.placeRepo.create({ facilityId, ...dto } as any);
    try {
      return await this.placeRepo.save(place);
    } catch (e) {
      throw new BadRequestException('Duplicate active place name in facility');
    }
  }

  async updatePlace(facilityId: number, placeId: number, dto: UpdatePlaceDto, requester: any) {
    await this.requirePlace(facilityId, placeId, requester);
    if (dto.minCapacity && dto.maxCapacity && dto.minCapacity > dto.maxCapacity) {
      throw new BadRequestException('minCapacity must be <= maxCapacity');
    }
    await this.placeRepo.update({ id: placeId }, dto as any);
    return this.placeRepo.findOne({ where: { id: placeId } });
  }

  async deletePlace(facilityId: number, placeId: number, requester: any) {
    await this.requirePlace(facilityId, placeId, requester);
    await this.placeRepo.update({ id: placeId }, { deletedAt: new Date() } as any);
    return true;
  }

  /** Place working hours */
  async listPlaceHours(facilityId: number, placeId: number, requester?: any) {
    await this.requirePlace(facilityId, placeId, requester);
    return this.hoursRepo.find({ where: { placeId }, order: { weekday: 'ASC', segmentNo: 'ASC' } as any });
  }

  async upsertPlaceHour(facilityId: number, placeId: number, dto: UpsertPlaceHoursDto, requester: any) {
    await this.requirePlace(facilityId, placeId, requester);

    if (dto.openTime >= dto.closeTime && !dto.isClosed) {
      throw new BadRequestException('openTime must be before closeTime');
    }

    const existing = await this.hoursRepo.findOne({ where: { placeId, weekday: dto.weekday, segmentNo: dto.segmentNo } as any });
    if (existing) {
      await this.hoursRepo.update({ id: existing.id }, {
        openTime: dto.openTime, closeTime: dto.closeTime, isClosed: dto.isClosed,
      } as any);
      return this.hoursRepo.findOne({ where: { id: existing.id } });
    }
    return this.hoursRepo.save(this.hoursRepo.create({ placeId, ...dto } as any));
  }

  async deletePlaceHour(facilityId: number, placeId: number, weekday: number, segmentNo: number, requester: any) {
    await this.requirePlace(facilityId, placeId, requester);
    await this.hoursRepo.delete({ placeId, weekday, segmentNo } as any);
    return true;
  }

  /** Staff */
  async listStaff(facilityId: number, requester?: any) {
    await this.ensureFacilityAccess(facilityId, requester);
    return this['dataSource'].createQueryBuilder()
      .select([
        'fs.user_id AS "userId"', 'fs.role_id AS "roleId"',
        'u.name AS "name"',
      ])
      .from('facility_staff', 'fs')
      .innerJoin('users', 'u', 'u.id = fs.user_id')
      .where('fs.facility_id = :fid', { fid: facilityId })
      .getRawMany();
  }

  async addStaff(facilityId: number, dto: AddStaffDto, requester: any) {
    await this.ensureFacilityAccess(facilityId, requester);
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new BadRequestException('User not found');
    try {
      await this.staffRepo.save(this.staffRepo.create({ facilityId, userId: dto.userId, roleId: dto.roleId } as any));
      return true;
    } catch {
      return true; // idempotent on duplicate PK
    }
  }

  async removeStaff(facilityId: number, userId: number, roleId: number, requester: any) {
    await this.ensureFacilityAccess(facilityId, requester);
    await this.staffRepo.delete({ facilityId, userId, roleId } as any);
    return true;
  }

  /** Pricing profiles */
  async listPricingProfiles(facilityId: number, placeId: number, requester: any) {
    await this.requirePlace(facilityId, placeId, requester);
    return this.profileRepo.find({
      where: { placeId, deletedAt: null } as any,
      order: { isDefault: 'DESC', effectiveFrom: 'DESC', id: 'DESC' } as any,
    });
  }

  async createPricingProfile(
    facilityId: number,
    placeId: number,
    dto: CreatePricingProfileDto,
    requester: any,
  ) {
    const place = await this.requirePlace(facilityId, placeId, requester);
    this.validatePricingProfileInput(dto.sessionDurationMinutes, dto.effectiveFrom, dto.effectiveUntil);

    const payload: Partial<PlacePricingProfile> = {
      placeId,
      name: dto.name?.trim() || 'Default',
      sessionDurationMinutes: dto.sessionDurationMinutes,
      basePrice: dto.basePrice,
      currency: (dto.currency ?? 'AED').toUpperCase(),
      timezone: dto.timezone ?? place?.facility?.timezone ?? 'Asia/Dubai',
      effectiveFrom: dto.effectiveFrom,
      effectiveUntil: dto.effectiveUntil ?? null,
      isDefault: dto.isDefault ?? false,
      metadata: dto.metadata ?? {},
    };

    const saved = await this.profileRepo.manager.transaction(async (trx) => {
      if (payload.isDefault) {
        await trx.createQueryBuilder()
          .update(PlacePricingProfile)
          .set({ isDefault: false } as any)
          .where('place_id = :placeId AND deleted_at IS NULL', { placeId })
          .execute();
      }
      const entity = trx.create(PlacePricingProfile, payload as any);
      return trx.save(entity);
    });

    return this.profileRepo.findOne({ where: { id: saved.id } as any });
  }

  async updatePricingProfile(
    facilityId: number,
    placeId: number,
    profileId: number,
    dto: UpdatePricingProfileDto,
    requester: any,
  ) {
    const profile = await this.requireProfile(facilityId, placeId, profileId, requester);
    const sessionMinutes = dto.sessionDurationMinutes ?? profile.sessionDurationMinutes;
    const effectiveFrom = dto.effectiveFrom ?? profile.effectiveFrom;
    const effectiveUntil = dto.effectiveUntil ?? profile.effectiveUntil ?? undefined;
    this.validatePricingProfileInput(sessionMinutes, effectiveFrom, effectiveUntil ?? undefined);

    const update: Partial<PlacePricingProfile> = {};
    if (dto.name !== undefined) update.name = dto.name.trim();
    if (dto.sessionDurationMinutes !== undefined) update.sessionDurationMinutes = dto.sessionDurationMinutes;
    if (dto.basePrice !== undefined) update.basePrice = dto.basePrice;
    if (dto.currency !== undefined) update.currency = dto.currency.toUpperCase();
    if (dto.timezone !== undefined) update.timezone = dto.timezone;
    if (dto.effectiveFrom !== undefined) update.effectiveFrom = dto.effectiveFrom;
    if (dto.effectiveUntil !== undefined) update.effectiveUntil = dto.effectiveUntil ?? null;
    if (dto.isDefault !== undefined) update.isDefault = dto.isDefault;
    if (dto.metadata !== undefined) update.metadata = dto.metadata;

    await this.profileRepo.manager.transaction(async (trx) => {
      if (dto.isDefault) {
        await trx.createQueryBuilder()
          .update(PlacePricingProfile)
          .set({ isDefault: false } as any)
          .where('place_id = :placeId AND deleted_at IS NULL AND id <> :profileId', { placeId, profileId })
          .execute();
      }
      if (Object.keys(update).length) {
        await trx.update(PlacePricingProfile, { id: profileId }, update as any);
      }
    });

    return this.profileRepo.findOne({ where: { id: profileId } as any });
  }

  async deletePricingProfile(facilityId: number, placeId: number, profileId: number, requester: any) {
    await this.requireProfile(facilityId, placeId, profileId, requester);
    const timestamp = new Date();
    await this.profileRepo.update({ id: profileId }, { deletedAt: timestamp, isDefault: false } as any);
    await this.ruleRepo.update({ pricingProfileId: profileId }, { deletedAt: timestamp } as any);
    return true;
  }

  /** Pricing rules */
  async listPricingRules(facilityId: number, placeId: number, profileId: number, requester: any) {
    await this.requireProfile(facilityId, placeId, profileId, requester);
    return this.ruleRepo.find({
      where: { pricingProfileId: profileId, deletedAt: null } as any,
      order: { priority: 'ASC', id: 'ASC' } as any,
    });
  }

  async createPricingRule(
    facilityId: number,
    placeId: number,
    profileId: number,
    dto: CreatePricingRuleDto,
    requester: any,
  ) {
    const profile = await this.requireProfile(facilityId, placeId, profileId, requester);
    this.validatePricingRuleInput(dto);

    if (dto.overrideType !== 'delta_percent' && !dto.currency) {
      throw new BadRequestException('currency is required unless overrideType is delta_percent');
    }

    if (dto.currency && dto.currency.toUpperCase() !== profile.currency && dto.overrideType !== 'delta_percent') {
      throw new BadRequestException('Override currency must match profile currency');
    }

    const payload: DeepPartial<PlacePriceRule> = {
      pricingProfileId: profileId,
      name: dto.name,
      priority: dto.priority ?? 100,
      overrideType: dto.overrideType,
      overrideValue: dto.overrideValue,
      currency: dto.currency ? dto.currency.toUpperCase() : null,
      effectiveDates: dto.effectiveDates ?? null,
      timeWindow: dto.timeWindow ?? null,
      weekdays: dto.weekdays ?? null,
      specificDates: dto.specificDates ?? null,
      appliesToCalendarFlags: dto.appliesToCalendarFlags ?? null,
      recurrence: dto.recurrence ?? null,
      metadata: dto.metadata ?? {},
      isActive: dto.isActive ?? true,
    };

    const entity = this.ruleRepo.create(payload);
    const saved = await this.ruleRepo.save(entity);
    return this.ruleRepo.findOne({ where: { id: saved.id } as any });
  }

  async updatePricingRule(
    facilityId: number,
    placeId: number,
    profileId: number,
    ruleId: number,
    dto: UpdatePricingRuleDto,
    requester: any,
  ) {
    const rule = await this.requireRule(facilityId, placeId, profileId, ruleId, requester);
    const merged: Partial<CreatePricingRuleDto> = {
      overrideType: (dto.overrideType ?? rule.overrideType) as any,
      overrideValue: (dto.overrideValue ?? rule.overrideValue) as any,
      weekdays: dto.weekdays ?? rule.weekdays ?? undefined,
      specificDates: dto.specificDates ?? rule.specificDates ?? undefined,
      currency: (dto.currency ?? rule.currency ?? undefined) as any,
    };
    this.validatePricingRuleInput(merged);

    const profile = await this.profileRepo.findOne({ where: { id: profileId } as any });
    if (
      profile &&
      merged.overrideType !== 'delta_percent' &&
      (!merged.currency || merged.currency.toUpperCase() !== profile.currency)
    ) {
      throw new BadRequestException('Override currency must match profile currency');
    }

    if (merged.overrideType !== 'delta_percent' && !merged.currency) {
      throw new BadRequestException('currency is required unless overrideType is delta_percent');
    }

    const update: Partial<PlacePriceRule> = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.priority !== undefined) update.priority = dto.priority;
    if (dto.overrideType !== undefined) update.overrideType = dto.overrideType;
    if (dto.overrideValue !== undefined) update.overrideValue = dto.overrideValue;
    if (dto.currency !== undefined) update.currency = dto.currency ? dto.currency.toUpperCase() : null;
    if (dto.effectiveDates !== undefined) update.effectiveDates = dto.effectiveDates ?? null;
    if (dto.timeWindow !== undefined) update.timeWindow = dto.timeWindow ?? null;
    if (dto.weekdays !== undefined) update.weekdays = dto.weekdays ?? null;
    if (dto.specificDates !== undefined) update.specificDates = dto.specificDates ?? null;
    if (dto.appliesToCalendarFlags !== undefined) update.appliesToCalendarFlags = dto.appliesToCalendarFlags ?? null;
    if (dto.recurrence !== undefined) update.recurrence = dto.recurrence ?? null;
    if (dto.metadata !== undefined) update.metadata = dto.metadata ?? {};
    if (dto.isActive !== undefined) update.isActive = dto.isActive;

    if (Object.keys(update).length) {
      await this.ruleRepo.update({ id: ruleId }, update as any);
    }

    return this.ruleRepo.findOne({ where: { id: ruleId } as any });
  }

  async deletePricingRule(
    facilityId: number,
    placeId: number,
    profileId: number,
    ruleId: number,
    requester: any,
  ) {
    await this.requireRule(facilityId, placeId, profileId, ruleId, requester);
    await this.ruleRepo.update({ id: ruleId }, { deletedAt: new Date() } as any);
    return true;
  }

  private async requirePlace(facilityId: number, placeId: number, requester?: any): Promise<Place> {
    await this.ensureFacilityAccess(facilityId, requester);
    const place = await this.placeRepo.findOne({ where: { id: placeId, facilityId, deletedAt: null } as any, relations: ['facility'] });
    if (!place) throw new NotFoundException('Place not found');
    return place;
  }

  private async requireProfile(
    facilityId: number,
    placeId: number,
    profileId: number,
    requester?: any,
  ): Promise<PlacePricingProfile> {
    await this.requirePlace(facilityId, placeId, requester);
    const profile = await this.profileRepo.findOne({ where: { id: profileId, placeId, deletedAt: null } as any });
    if (!profile) throw new NotFoundException('Pricing profile not found');
    return profile;
  }

  private async requireRule(
    facilityId: number,
    placeId: number,
    profileId: number,
    ruleId: number,
    requester?: any,
  ): Promise<PlacePriceRule> {
    await this.requireProfile(facilityId, placeId, profileId, requester);
    const rule = await this.ruleRepo.findOne({
      where: { id: ruleId, pricingProfileId: profileId, deletedAt: null } as any,
    });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    return rule;
  }

  private validatePricingProfileInput(
    sessionDurationMinutes?: number,
    effectiveFrom?: string,
    effectiveUntil?: string,
  ) {
    if (sessionDurationMinutes !== undefined) {
      if (sessionDurationMinutes < 60 || sessionDurationMinutes % 60 !== 0) {
        throw new BadRequestException('sessionDurationMinutes must be at least 60 and a multiple of 60');
      }
    }
    if (effectiveFrom && effectiveUntil && effectiveUntil < effectiveFrom) {
      throw new BadRequestException('effectiveUntil must be on or after effectiveFrom');
    }
  }

  private validatePricingRuleInput(dto: Partial<CreatePricingRuleDto>) {
    if (dto.overrideType && !['set', 'delta_amount', 'delta_percent'].includes(dto.overrideType)) {
      throw new BadRequestException('Invalid override type');
    }

    if (dto.overrideValue !== undefined) {
      const numeric = Number(dto.overrideValue);
      if (Number.isNaN(numeric)) {
        throw new BadRequestException('overrideValue must be numeric');
      }
      if (dto.overrideType === 'delta_percent' && (numeric < -100 || numeric > 100)) {
        throw new BadRequestException('delta_percent overrideValue must be between -100 and 100');
      }
    }

    if (dto.weekdays) {
      if (!Array.isArray(dto.weekdays)) {
        throw new BadRequestException('weekdays must be an array');
      }
      const invalid = dto.weekdays.some((d) => d < 0 || d > 6);
      if (invalid) {
        throw new BadRequestException('weekdays must contain values between 0 (Sunday) and 6 (Saturday)');
      }
    }

    if (dto.specificDates) {
      const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
      const invalidDate = dto.specificDates.some((d) => !isoDatePattern.test(d));
      if (invalidDate) {
        throw new BadRequestException('specificDates must be in YYYY-MM-DD format');
      }
    }
  }

  /** Access: admin or a staff member of this facility */
  private async ensureFacilityAccess(facilityId: number, requester?: any) {
    if (await this.isAdmin(requester)) return;
    const ids = await this.getUserFacilityIds(requester);
    if (ids.includes(Number(facilityId))) return;
    throw new UnauthorizedException();
  }
}
