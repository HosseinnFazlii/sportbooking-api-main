import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AddStaffDto {
  @ApiProperty() @IsInt()
  userId: number;

  @ApiProperty() @IsInt()
  roleId: number;
}
