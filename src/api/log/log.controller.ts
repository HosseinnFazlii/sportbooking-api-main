import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base.controller';
import { LogService } from './log.service';
import { Log } from '../../entities/log';
import { LogType } from '../../entities/logType';

@ApiTags('log')
@ApiBearerAuth()
@Controller('log')
export class LogController extends BaseController<Log> {
  constructor(private readonly logs: LogService) {
    super(logs, 'log', {
      permissions: {
        list: ['log.read'],
        read: ['log.read'],
        create: ['log.create'],
        update: ['log.update'],
        delete: ['log.delete'],
      },
    });
  }

  @Get('types')
  listTypes() {
    return this.logs.listTypes();
  }

  @Post('types')
  createType(@Body() dto: Partial<LogType>) {
    return this.logs.createType(dto);
  }

  @Get('v')
  listVLogs(@Query() query: any) {
    return this.logs.listVLogs(query);
  }

  // Base GET /log and GET /log/:id remain available
}
