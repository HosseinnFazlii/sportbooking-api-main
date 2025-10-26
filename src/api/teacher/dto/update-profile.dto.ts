import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTeacherProfileDto {
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional() @IsString() @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ example: '200.00', description: 'Hourly rate (numeric(12,2))' })
  @IsOptional() @IsNumberString()
  hourlyRate?: string;
}
