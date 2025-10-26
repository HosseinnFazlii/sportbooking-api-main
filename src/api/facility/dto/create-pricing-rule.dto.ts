import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export type OverrideType = 'set' | 'delta_amount' | 'delta_percent';

export class CreatePricingRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Priority (lower runs first)', default: 100, minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  priority?: number;

  @ApiProperty({ description: 'Override type', enum: ['set', 'delta_amount', 'delta_percent'] })
  @IsString()
  @Matches(/^(set|delta_amount|delta_percent)$/)
  overrideType!: OverrideType;

  @ApiProperty({ description: 'Numeric override value', example: '25.00' })
  @IsNumberString()
  overrideValue!: string;

  @ApiPropertyOptional({ description: 'Currency (required unless overrideType is delta_percent)' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be a 3-letter ISO code' })
  currency?: string | null;

  @ApiPropertyOptional({ description: 'Effective date range e.g. [2024-01-01,2024-12-31]' })
  @IsOptional()
  @IsString()
  effectiveDates?: string | null;

  @ApiPropertyOptional({ description: 'Time window (text range) e.g. [08:00:00,12:00:00)' })
  @IsOptional()
  @IsString()
  timeWindow?: string | null;

  @ApiPropertyOptional({ description: 'Weekdays the rule applies to (0=Sunday ... 6=Saturday)' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  weekdays?: number[];

  @ApiPropertyOptional({ description: 'Specific dates (YYYY-MM-DD)' })
  @IsOptional()
  @IsArray()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u, { each: true, message: 'specificDates must be YYYY-MM-DD' })
  specificDates?: string[];

  @ApiPropertyOptional({ description: 'Calendar flags that must match (json object)' })
  @IsOptional()
  @IsObject()
  appliesToCalendarFlags?: Record<string, any> | null;

  @ApiPropertyOptional({ description: 'Recurrence string (optional)' })
  @IsOptional()
  @IsString()
  recurrence?: string | null;

  @ApiPropertyOptional({ description: 'Custom metadata (json object)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether the rule is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
