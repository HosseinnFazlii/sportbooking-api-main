import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from '../../entities/log';
import { LogType } from '../../entities/logType';
import { VLog } from '../../entities/vLog';
import { LogService } from './log.service';
import { LogController } from './log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Log, LogType, VLog])],
  providers: [LogService],
  controllers: [LogController],
  exports: [LogService],
})
export class LogModule {}
