import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Place } from '../../entities/place';
import { PlacePricingProfile } from '../../entities/placePricingProfile';
import { PlacePriceRule } from '../../entities/placePriceRule';
import { Calendar } from '../../entities/calendar';

export type PriceOverrideType = 'set' | 'delta_amount' | 'delta_percent';

export interface PriceRuleApplication {
  id: number;
  name: string;
  overrideType: PriceOverrideType;
  overrideValue: string;
  currency?: string | null;
  metadata?: Record<string, any>;
}

export interface PriceQuote {
  placeId: number;
  pricingProfileId: number;
  sessionDurationMinutes: number;
  sessionBlocks: number;
  basePricePerSession: string;
  unitPrice: number;
  currency: string;
  appliedRuleIds: string[];
  appliedRules: PriceRuleApplication[];
  pricingDetails: Record<string, any>;
  timezone: string;
  localStart: string;
  localEnd: string;
}

export interface RateCardProfileSummary {
  profile: PlacePricingProfile;
  rules: PlacePriceRule[];
}

export interface RateCardResponse {
  placeId: number;
  profiles: RateCardProfileSummary[];
}

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(Place) private readonly placeRepo: Repository<Place>,
    @InjectRepository(PlacePricingProfile) private readonly profileRepo: Repository<PlacePricingProfile>,
    @InjectRepository(PlacePriceRule) private readonly ruleRepo: Repository<PlacePriceRule>,
    @InjectRepository(Calendar) private readonly calendarRepo: Repository<Calendar>,
  ) {}

  async quoteForSlot(placeId: number, startAt: string | Date, endAt: string | Date): Promise<PriceQuote> {
    const place = await this.placeRepo.findOne({ where: { id: placeId, deletedAt: IsNull() } as any });
    if (!place) throw new NotFoundException('Place not found');

    const start = this.asDate(startAt, 'startAt');
    const end = this.asDate(endAt, 'endAt');
    if (end <= start) {
      throw new BadRequestException('endAt must be after startAt');
    }

    const profiles = await this.profileRepo.find({
      where: { placeId, deletedAt: IsNull() } as any,
      order: { isDefault: 'DESC', effectiveFrom: 'DESC' } as any,
    });
    if (!profiles.length) {
      throw new BadRequestException('No pricing profile configured for this place');
    }

    const profile = this.resolveProfileForDate(profiles, start);
    if (!profile) {
      throw new BadRequestException('No active pricing profile found for the requested date');
    }

    const sessionDuration = profile.sessionDurationMinutes;
    if (!sessionDuration || sessionDuration <= 0) {
      throw new BadRequestException('Pricing profile has invalid session duration');
    }

    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (durationMinutes % sessionDuration !== 0) {
      throw new BadRequestException(`Requested slot must align with ${sessionDuration} minute session blocks`);
    }
    const sessionBlocks = Math.max(1, durationMinutes / sessionDuration);

    const startParts = this.getZonedParts(start, profile.timezone);
    const endParts = this.getZonedParts(end, profile.timezone);
    const calendar = await this.calendarRepo.findOne({ where: { gregorianDate: startParts.dateStr } as any });

    const { appliedRuleIds, appliedRules, perSessionPrice } = await this.applyRules(
      profile,
      startParts,
      endParts,
      calendar,
    );

    const unitPriceNumber = this.roundCurrency(perSessionPrice * sessionBlocks);
    if (unitPriceNumber < 0) {
      throw new BadRequestException('Computed price cannot be negative');
    }

    const pricingDetails: Record<string, any> = {
      profileId: profile.id,
      profileName: profile.name,
      basePricePerSession: profile.basePrice,
      sessionDurationMinutes: profile.sessionDurationMinutes,
      sessionBlocks,
      currency: profile.currency,
      appliedRules,
      timezone: profile.timezone,
      localStart: startParts.dateStr + 'T' + startParts.timeStr,
      localEnd: endParts.dateStr + 'T' + endParts.timeStr,
    };

    return {
      placeId,
      pricingProfileId: profile.id,
      sessionDurationMinutes: profile.sessionDurationMinutes,
      sessionBlocks,
      basePricePerSession: this.formatCurrency(Number(profile.basePrice)),
      unitPrice: unitPriceNumber,
      currency: profile.currency,
      appliedRuleIds,
      appliedRules,
      pricingDetails,
      timezone: profile.timezone,
      localStart: pricingDetails.localStart,
      localEnd: pricingDetails.localEnd,
    };
  }

  async getRateCard(placeId: number): Promise<RateCardResponse> {
    const place = await this.placeRepo.findOne({ where: { id: placeId, deletedAt: IsNull() } as any });
    if (!place) throw new NotFoundException('Place not found');

    const profiles = await this.profileRepo.find({
      where: { placeId, deletedAt: IsNull() } as any,
      order: { effectiveFrom: 'DESC', id: 'DESC' } as any,
    });
    if (!profiles.length) {
      throw new BadRequestException('No pricing profile configured for this place');
    }

    const summaries: RateCardProfileSummary[] = [];
    for (const profile of profiles) {
      const rules = await this.ruleRepo.find({
        where: { pricingProfileId: profile.id, deletedAt: IsNull() } as any,
        order: { priority: 'ASC', id: 'ASC' } as any,
      });
      summaries.push({ profile, rules });
    }

    return { placeId, profiles: summaries };
  }

  private resolveProfileForDate(profiles: PlacePricingProfile[], start: Date): PlacePricingProfile | null {
    for (const profile of profiles) {
      const parts = this.getZonedParts(start, profile.timezone);
      if (this.dateWithinBounds(parts.dateStr, profile.effectiveFrom, profile.effectiveUntil)) {
        return profile;
      }
    }
    // fallback to first default
    return profiles.find((p) => p.isDefault) ?? null;
  }

  private dateWithinBounds(dateStr: string, from: string, until?: string | null): boolean {
    if (dateStr < from) return false;
    if (until && until !== '' && dateStr > until) return false;
    return true;
  }

  private async applyRules(
    profile: PlacePricingProfile,
    startParts: ZonedParts,
    endParts: ZonedParts,
    calendar?: Calendar | null,
  ): Promise<{ appliedRuleIds: string[]; appliedRules: PriceRuleApplication[]; perSessionPrice: number }> {
    const basePrice = this.asNumber(profile.basePrice);
    let workingPrice = basePrice;
    const appliedRuleIds: string[] = [];
    const appliedRules: PriceRuleApplication[] = [];

    const rules = await this.ruleRepo.find({
      where: { pricingProfileId: profile.id, isActive: true, deletedAt: IsNull() } as any,
      order: { priority: 'ASC', id: 'ASC' } as any,
    });

    for (const rule of rules) {
      if (!this.ruleMatches(rule, startParts, endParts, calendar)) continue;
      if (rule.overrideType !== 'delta_percent') {
        const currency = rule.currency ?? profile.currency;
        if (currency !== profile.currency) {
          throw new BadRequestException('Currency mismatch on pricing override');
        }
      }

      workingPrice = this.applyOverride(workingPrice, rule);
      appliedRuleIds.push(String(rule.id));
      appliedRules.push({
        id: Number(rule.id),
        name: rule.name,
        overrideType: rule.overrideType,
        overrideValue: rule.overrideValue,
        currency: rule.currency,
        metadata: rule.metadata,
      });
    }

    workingPrice = this.roundCurrency(workingPrice);

    return { appliedRuleIds, appliedRules, perSessionPrice: workingPrice };
  }

  private ruleMatches(
    rule: PlacePriceRule,
    startParts: ZonedParts,
    endParts: ZonedParts,
    calendar?: Calendar | null,
  ): boolean {
    if (rule.deletedAt) return false;
    if (!rule.isActive) return false;

    if (rule.effectiveDates && !this.rangeContains(rule.effectiveDates as unknown as string, startParts.dateStr)) {
      return false;
    }

    if (rule.specificDates?.length) {
      if (!rule.specificDates.some((d) => d === startParts.dateStr)) {
        return false;
      }
    }

    if (rule.weekdays?.length) {
      if (!rule.weekdays.includes(startParts.weekday)) {
        return false;
      }
    }

    if (rule.timeWindow) {
      if (!this.rangeContains(rule.timeWindow as unknown as string, startParts.timeStr)) {
        return false;
      }
      if (!this.rangeContains(rule.timeWindow as unknown as string, endParts.timeStr, true)) {
        return false;
      }
    }

    if (rule.appliesToCalendarFlags && calendar) {
      const flags = rule.appliesToCalendarFlags as Record<string, any>;
      for (const [key, expected] of Object.entries(flags)) {
        if ((calendar as any)[key] !== expected) {
          return false;
        }
      }
    } else if (rule.appliesToCalendarFlags && !calendar) {
      return false;
    }

    // Recurrence is currently informational; assume handled via weekdays/time windows.
    return true;
  }

  private applyOverride(current: number, rule: PlacePriceRule): number {
    const value = this.asNumber(rule.overrideValue);
    switch (rule.overrideType) {
      case 'set':
        return value;
      case 'delta_amount':
        return current + value;
      case 'delta_percent':
        return current * (1 + value / 100);
      default:
        return current;
    }
  }

  private asDate(input: string | Date, field: string): Date {
    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private asNumber(value: string | number): number {
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num)) {
      throw new BadRequestException('Invalid numeric value in pricing configuration');
    }
    return num;
  }

  private formatCurrency(value: number): string {
    return value.toFixed(2);
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private rangeContains(range: string, value: string, treatEndExclusive = false): boolean {
    if (!range) return true;
    const match = /^([\[\(])([^,]*),([^\)\]]*)([\)\]])$/.exec(range);
    if (!match) return true;
    const [, startSym, startVal, endVal, endSym] = match;
    const inclusiveStart = startSym === '[';
    const inclusiveEnd = endSym === ']';

    if (startVal && startVal !== '-infinity') {
      if (value < startVal) return false;
      if (!inclusiveStart && value === startVal) return false;
    }

    if (endVal && endVal !== 'infinity') {
      if (value > endVal) return false;
      if ((treatEndExclusive || !inclusiveEnd) && value === endVal) return false;
    }

    return true;
  }

  private getZonedParts(date: Date, timezone: string): ZonedParts {
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);

    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);

    const weekdayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    })
      .format(date)
      .toLowerCase();

    const weekdayMap: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };

    const weekday = weekdayMap[weekdayStr.substring(0, 3)] ?? 0;

    return { dateStr, timeStr, weekday };
  }
}

type ZonedParts = {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm:ss
  weekday: number; // 0=Sunday ... 6=Saturday
};
