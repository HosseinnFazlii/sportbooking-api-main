import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class QuoteSlotDto {
  @ApiProperty({ description: 'Session start datetime (ISO 8601)' })
  @IsISO8601()
  startAt: string;

  @ApiProperty({ description: 'Session end datetime (ISO 8601)' })
  @IsISO8601()
  endAt: string;
}
