import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsInt, Min, MinLength } from 'class-validator';

export class LoginPasswordDto {
  @ApiPropertyOptional({ description: 'E.164 mobile, e.g. +971501234567' })
  @IsNumber()
  mobile: number;

  @ApiProperty({ description: 'Password (min 6 chars)' })
  @IsString()
  @MinLength(6)
  password: string;
}
