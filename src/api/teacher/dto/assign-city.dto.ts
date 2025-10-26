import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AssignCityDto {
  @ApiProperty() @IsInt()
  cityId: number;
}
