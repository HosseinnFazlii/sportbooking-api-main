import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsString, Min } from 'class-validator';

export class RequestOtpDto {
  @ApiPropertyOptional({ description: 'E.164 mobile, e.g. +971501234567' })
  @IsNumber()
  mobile: number;

  @ApiProperty({ enum: ['login', 'register', 'reset'] })
  @IsString()
  @IsIn(['login', 'register', 'reset'])
  purpose: 'login' | 'register' | 'reset';
}
