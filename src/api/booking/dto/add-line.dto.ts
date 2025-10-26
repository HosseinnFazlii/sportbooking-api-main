import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddLineDto {
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
