import { ApiPropertyOptional } from '@nestjs/swagger';

export class TournamentRegisterDto {
  @ApiPropertyOptional({ description: 'If true, only place a hold (status may remain pending/awaiting_opponent).' })
  holdOnly?: boolean;
}
