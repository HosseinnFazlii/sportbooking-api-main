import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sport } from '../../entities/sport';
import { SportService } from './sport.service';
import { SportController } from './sport.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sport])],
  providers: [SportService],
  controllers: [SportController],
  exports: [SportService],
})
export class SportModule {}
