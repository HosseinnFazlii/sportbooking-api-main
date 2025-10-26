import { Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base.controller';
import { SportService } from './sport.service';
import { Sport } from '../../entities/sport';

@ApiTags('sport')
@ApiBearerAuth()
@Controller('sport')
export class SportController extends BaseController<Sport> {
  constructor(private readonly sports: SportService) {
    super(sports, 'sport', {
      permissions: {
        list: ['sport.read'],
        read: ['sport.read'],
        create: ['sport.create'],
        update: ['sport.update'],
        delete: ['sport.delete'],
      },
    });
  }

  @Get('active')
  listActive() { return this.sports.listActive(); }

  @Put(':id/toggle')
  toggle(@Param('id') id: number) { return this.sports.toggleActive(+id); }
}
