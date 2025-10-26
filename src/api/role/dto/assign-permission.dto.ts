import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ArrayNotEmpty, ValidateIf } from 'class-validator';

export class AssignPermissionDto {
  @ValidateIf(o => !o.permissionIds)
  @ApiProperty({ required: false })
  @IsInt()
  permissionId?: number;

  @ValidateIf(o => !o.permissionId)
  @ApiProperty({ required: false, type: [Number] })
  @IsArray() @ArrayNotEmpty()
  permissionIds?: number[];
}
