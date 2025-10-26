import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

import { Booking } from '../../entities/booking';
import { BookingLine } from '../../entities/bookingLine';
import { BookingStatus } from '../../entities/bookingStatus';
import { Place } from '../../entities/place';
import { Facility } from '../../entities/facility';
import { Sport } from '../../entities/sport';
import { TeacherProfile } from '../../entities/teacherProfile';
import { FacilityStaff } from '../../entities/facilityStaff';
import { Log } from '../../entities/log';
import { LogType } from '../../entities/logType';
import { Calendar } from '../../entities/calendar';
import { Course } from '../../entities/course';
import { CourseSession } from '../../entities/courseSession';
import { Tournament } from '../../entities/tournament';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingLine,
      BookingStatus,
      Course,
      CourseSession,
      Tournament,
      Place,
      Facility,
      Sport,
      TeacherProfile,
      FacilityStaff,
      Log,
      LogType,
      Calendar, // optional; if you don’t use Persian calendar just keep it here for DI ease
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
