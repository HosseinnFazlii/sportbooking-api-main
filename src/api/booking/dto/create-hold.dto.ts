import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class HoldLineDto {
  @ApiProperty({ description: 'Place id' })
  @IsInt() placeId: number;

  @ApiPropertyOptional({ description: 'Teacher id (optional)' })
  @IsOptional() @IsInt() teacherId?: number;

  @ApiPropertyOptional({ description: 'Course session id (optional)' })
  @IsOptional() @IsInt() courseSessionId?: number;

  @ApiProperty({ description: 'ISO start datetime (timestamptz)' })
  @IsString() startAt: string;

  @ApiProperty({ description: 'ISO end datetime (timestamptz)' })
  @IsString() endAt: string;

  @ApiProperty({ description: 'Qty (>=1)', default: 1 })
  @IsInt() @Min(1) qty: number = 1;
}

export class CreateHoldDto {
  @ApiPropertyOptional({ description: 'Currency (3-letter ISO)', default: 'AED' })
  @IsOptional() @MinLength(3) @IsString() currency?: string = 'AED';

  @ApiPropertyOptional({ description: 'Hold seconds (default 900 = 15min)', default: 900 })
  @IsOptional() @IsInt() @Min(60) holdSeconds?: number = 900;

  @ApiPropertyOptional({ description: 'Idempotency key (optional)' })
  @IsOptional() @IsUUID() idempotencyKey?: string;

  @ApiPropertyOptional({ type: [HoldLineDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => HoldLineDto)
  lines?: HoldLineDto[];
}
