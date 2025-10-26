import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiPropertyOptional({ description: 'E.164 mobile, e.g. +971501234567' })
  @IsNumber()
  mobile: number;
  
  @ApiProperty({ description: 'Full name' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Optional password. If provided, will be hashed.' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ description: 'OTP code previously requested with purpose=register' })
  @IsString()
  @MinLength(4)
  otpCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  marketingOptIn?: boolean;
}
