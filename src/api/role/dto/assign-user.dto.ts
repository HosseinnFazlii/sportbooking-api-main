import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AssignUserDto {
  @ApiProperty() @IsInt()
  userId: number;
}
