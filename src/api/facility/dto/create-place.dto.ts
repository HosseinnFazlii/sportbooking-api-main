import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePlaceDto {
  @ApiProperty() @IsString() @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Sport id' }) @IsInt()
  sportId: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  surface?: string;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean()
  indoor?: boolean;

  @ApiProperty({ default: 1 }) @IsInt() @Min(1)
  minCapacity: number;

  @ApiProperty({ default: 1 }) @IsInt() @Min(1)
  maxCapacity: number;
}
