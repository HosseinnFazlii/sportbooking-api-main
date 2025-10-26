import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
export class AssignRoleDto {
  @ApiProperty() @IsInt()
  roleId: number;
}
