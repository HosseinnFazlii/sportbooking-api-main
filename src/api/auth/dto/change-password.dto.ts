import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Password (min 6 chars)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'New Password (min 6 chars)' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
