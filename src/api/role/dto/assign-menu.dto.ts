import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AssignMenuDto {
  @ApiProperty() @IsInt()
  menuId: number;
}
