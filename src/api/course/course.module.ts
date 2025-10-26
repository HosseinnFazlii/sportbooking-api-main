import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../../entities/course';
import { CourseSession } from '../../entities/courseSession';
import { CourseImage } from '../../entities/courseImage';
import { Place } from '../../entities/place';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { VCourse } from '../../entities/vCourse';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseSession, CourseImage, Place, VCourse])],
  providers: [CourseService],
  controllers: [CourseController],
  exports: [CourseService],
})
export class CourseModule {}
