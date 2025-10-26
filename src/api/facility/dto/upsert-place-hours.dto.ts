import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsMilitaryTime, Min } from 'class-validator';

export class UpsertPlaceHoursDto {
  @ApiProperty({ minimum: 0, maximum: 6 }) @IsInt() @Min(0)
  weekday: number;

  @ApiProperty({ default: 1, minimum: 1 }) @IsInt() @Min(1)
  segmentNo: number;

  @ApiProperty({ example: '08:00:00' }) @IsMilitaryTime()
  openTime: string;

  @ApiProperty({ example: '22:00:00' }) @IsMilitaryTime()
  closeTime: string;

  @ApiProperty({ default: false }) @IsBoolean()
  isClosed: boolean;
}
