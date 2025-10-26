import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AssignSportDto {
  @ApiProperty() @IsInt()
  sportId: number;
}
