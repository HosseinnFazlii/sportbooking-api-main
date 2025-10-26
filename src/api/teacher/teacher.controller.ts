import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TeacherService } from './teacher.service';
import { UpdateTeacherProfileDto } from './dto/update-profile.dto';
import { AssignCityDto } from './dto/assign-city.dto';
import { AssignSportDto } from './dto/assign-sport.dto';
import { UpsertWorkingHourDto } from './dto/upsert-working-hour.dto';

@ApiTags('teacher')
@ApiBearerAuth()
@Controller('teacher')
export class TeacherController {
  constructor(private readonly teachers: TeacherService) {}

  @Get('available')
  @ApiOperation({ summary: 'Search available teachers for place & slot (optional sportId)' })
  available(@Query('placeId') placeId: number, @Query('startAt') startAt: string, @Query('endAt') endAt: string, @Query('sportId') sportId?: number, @Req() req?: any) {
    return this.teachers.availableTeachers({ placeId: +placeId, startAt, endAt, sportId: sportId ? +sportId : undefined }, req?.user);
  }
  
  @Get()
  @ApiOperation({ summary: 'List teachers with profile (filters: sportId, cityId)' })
  list(@Query('sportId') sportId?: number, @Query('cityId') cityId?: number) {
    return this.teachers.listTeachers({ sportId: +sportId || undefined, cityId: +cityId || undefined });
  }

  @Put(':teacherId/profile')
  updateProfile(@Param('teacherId') teacherId: number, @Body() dto: UpdateTeacherProfileDto, @Req() req: any) {
    return this.teachers.updateProfile(+teacherId, dto, req.user);
  }

  @Get(':teacherId/sports')
  listSports(@Param('teacherId') teacherId: number) {
    return this.teachers.listSports(+teacherId);
  }
  @Post(':teacherId/sports')
  addSport(@Param('teacherId') teacherId: number, @Body() dto: AssignSportDto, @Req() req: any) {
    return this.teachers.addSport(+teacherId, dto, req.user);
  }
  @Delete(':teacherId/sports/:sportId')
  removeSport(@Param('teacherId') teacherId: number, @Param('sportId') sportId: number, @Req() req: any) {
    return this.teachers.removeSport(+teacherId, +sportId, req.user);
  }

  @Get(':teacherId/cities')
  listCities(@Param('teacherId') teacherId: number) {
    return this.teachers.listCities(+teacherId);
  }
  @Post(':teacherId/cities')
  addCity(@Param('teacherId') teacherId: number, @Body() dto: AssignCityDto, @Req() req: any) {
    return this.teachers.addCity(+teacherId, dto, req.user);
  }
  @Delete(':teacherId/cities/:cityId')
  removeCity(@Param('teacherId') teacherId: number, @Param('cityId') cityId: number, @Req() req: any) {
    return this.teachers.removeCity(+teacherId, +cityId, req.user);
  }

  @Get(':teacherId/hours')
  listHours(@Param('teacherId') teacherId: number) {
    return this.teachers.listWorkingHours(+teacherId);
  }
  @Post(':teacherId/hours')
  upsertHour(@Param('teacherId') teacherId: number, @Body() dto: UpsertWorkingHourDto, @Req() req: any) {
    return this.teachers.upsertWorkingHour(+teacherId, dto, req.user);
  }
  @Delete(':teacherId/hours/:weekday/:segmentNo')
  deleteHour(@Param('teacherId') teacherId: number, @Param('weekday') weekday: number, @Param('segmentNo') segmentNo: number, @Req() req: any) {
    return this.teachers.deleteWorkingHour(+teacherId, +weekday, +segmentNo, req.user);
  }

}
