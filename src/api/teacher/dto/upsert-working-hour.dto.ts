import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsMilitaryTime, Min } from 'class-validator';

export class UpsertWorkingHourDto {
  @ApiProperty({ minimum: 0, maximum: 6 }) @IsInt() @Min(0)
  weekday: number; // 0=Sun..6=Sat (matches DB) :contentReference[oaicite:7]{index=7}

  @ApiProperty({ default: 1, minimum: 1 }) @IsInt() @Min(1)
  segmentNo: number;

  @ApiProperty({ example: '09:00:00' }) @IsMilitaryTime()
  openTime: string;

  @ApiProperty({ example: '18:00:00' }) @IsMilitaryTime()
  closeTime: string;

  @ApiProperty({ default: false }) @IsBoolean()
  isClosed: boolean;
}
