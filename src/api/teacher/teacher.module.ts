import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherProfile } from '../../entities/teacherProfile';
import { TeacherSport } from '../../entities/teacherSport';
import { TeacherCity } from '../../entities/teacherCity';
import { TeacherWorkingHour } from '../../entities/teacherWorkingHour';
import { User } from '../../entities/user';
import { Place } from '../../entities/place';
import { TeacherService } from './teacher.service';
import { TeacherController } from './teacher.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherProfile, TeacherSport, TeacherCity, TeacherWorkingHour, User, Place])],
  providers: [TeacherService],
  controllers: [TeacherController],
  exports: [TeacherService],
})
export class TeacherModule {}
