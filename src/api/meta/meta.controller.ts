import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MetaService } from './meta.service';

@ApiTags('meta')
@ApiBearerAuth()
@Controller('meta')
export class MetaController {
  constructor(private readonly meta: MetaService) {}

  @Get('booking-statuses') bookingStatuses() { return this.meta.bookingStatuses(); }
  @Get('tournament-types') tournamentTypes() { return this.meta.tournamentTypes(); }
  @Get('tournament-reg-statuses') tournamentRegStatuses() { return this.meta.tournamentRegStatuses(); }
}
