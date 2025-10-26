import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class VerifyOtpDto {
  @ApiPropertyOptional({ description: 'E.164 mobile, e.g. +971501234567' })
  @IsNumber()
  mobile: number;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  code: string;

  @ApiProperty({ enum: ['login', 'register', 'reset'] })
  @IsString()
  @IsIn(['login', 'register', 'reset'])
  purpose: 'login' | 'register' | 'reset';
}
