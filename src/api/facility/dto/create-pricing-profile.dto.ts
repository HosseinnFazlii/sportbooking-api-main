import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePricingProfileDto {
  @ApiPropertyOptional({ description: 'Display name for the profile', default: 'Default' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Session duration in minutes (>= 60 and multiples of 60)', default: 60 })
  @IsInt()
  @Min(60)
  sessionDurationMinutes!: number;

  @ApiProperty({ description: 'Base price per session (numeric string)', example: '150.00' })
  @IsNumberString()
  basePrice!: string;

  @ApiPropertyOptional({ description: 'Currency code (ISO 4217)', default: 'AED' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be a 3-letter ISO code' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Timezone identifier', default: 'Asia/Dubai' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: 'Effective start date (YYYY-MM-DD)' })
  @Matches(DATE_REGEX, { message: 'effectiveFrom must be in YYYY-MM-DD format' })
  effectiveFrom!: string;

  @ApiPropertyOptional({ description: 'Effective end date (YYYY-MM-DD, optional)' })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'effectiveUntil must be in YYYY-MM-DD format' })
  effectiveUntil?: string;

  @ApiPropertyOptional({ description: 'Mark as default profile for the place', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata (stored as jsonb)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
