import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumberString, IsOptional, IsPositive } from 'class-validator';

export class CreateCourseSessionDto {
  @ApiProperty({ description: 'Teacher user id' })
  @IsInt()
  teacherId: number;

  @ApiProperty({ description: 'Place id' })
  @IsInt()
  placeId: number;

  @ApiProperty({ description: 'ISO start datetime (timestamptz)' })
  startAt: string;

  @ApiProperty({ description: 'ISO end datetime (timestamptz)' })
  endAt: string;

  @ApiProperty({ description: 'Price (numeric(12,2))', example: '150.00' })
  @IsNumberString()
  price: string;

  @ApiProperty({ description: 'Max capacity', default: 10 })
  @IsOptional()
  @IsPositive()
  maxCapacity?: number;
}
