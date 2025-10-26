import { Body, Controller, Get, Param, Post, Query, Req, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base.controller';
import { Course } from '../../entities/course';
import { VCourse } from '../../entities/vCourse';
import { CourseService } from './course.service';
import { CreateCourseSessionDto } from './dto/create-course-session.dto';

@ApiTags('course')
@ApiBearerAuth()
@Controller('course')
export class CourseController extends BaseController<Course, VCourse> {
  constructor(private readonly courses: CourseService) {
    super(courses, 'course', {
      permissions: {
        list: ['course.read'],
        read: ['course.read'],
        create: ['course.create'],
        update: ['course.update'],
        delete: ['course.delete'],
      },
    });
  }

  @Get()
  override findAll(@Query() query: any, @Req() request: any) {
    return super.findAll(query, request);
  }

  @Get(':id')
  override findOne(@Param('id') id: number, @Req() request: any) {
    return super.findOne(id, request);
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'List sessions of a course' })
  listSessions(@Param('id') id: number) {
    return this.courses.listSessions(id);
  }

  @Post(':id/sessions')
  @ApiOperation({ summary: 'Create a session under a course' })
  createSession(@Param('id') id: number, @Body() dto: CreateCourseSessionDto, @Req() req: any) {
    return this.courses.createSession(id, dto, req.user);
  }

  // Images
  @Get(':id/images')
  listImages(@Param('id') id: number) {
    return this.courses.listImages(+id);
  }

  @Post(':id/images')
  addImage(@Param('id') id: number, @Body() dto: { url: string; sort?: number }) {
    return this.courses.addImage(+id, dto.url, dto.sort ?? 0);
  }

  @Delete(':id/images/:imageId')
  removeImage(@Param('id') id: number, @Param('imageId') imageId: number) {
    return this.courses.removeImage(+id, +imageId);
  }
}
