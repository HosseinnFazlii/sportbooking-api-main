import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SubmitScoreDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  aScore: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  bScore: number;
}
