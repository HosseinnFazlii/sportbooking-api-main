// src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ormConfig } from '../config/ormconfig';
import { JwtAuthGuard } from '../api/auth/jwt-auth.guard';

import { LoggingInterceptor } from '../common/logging.interceptor';
import { AllExceptionsFilter } from '../common/all-exceptions.filter';
import { LoggingService } from '../common/logging.service';
import { Log } from '../entities/log';
import { LogType } from '../entities/logType';

// Feature modules
import { AuthModule } from '../api/auth/auth.module';
import { UserModule } from '../api/user/user.module';
import { BookingModule } from '../api/booking/booking.module';
import { CourseModule } from '../api/course/course.module';
import { TournamentModule } from '../api/tournament/tournament.module';
import { TeacherModule } from '../api/teacher/teacher.module';
import { FacilityModule } from '../api/facility/facility.module';
import { RoleModule } from '../api/role/role.module';
import { PermissionModule } from '../api/permission/permission.module';
import { SportModule } from '../api/sport/sport.module';
import { MenuModule } from '../api/menu/menu.module';
import { LogModule } from '../api/log/log.module';


import { UploadModule } from '../api/upload/upload.module';
import { MetaModule } from '../api/meta/meta.module';
import { DashboardModule } from 'api/dashboard/dashboard.module';

// If you want to use env-based config later:
// import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Order matters: later files override earlier ones (env vars from OS still win).
      envFilePath: ['.env', '.env.local', '.env.docker'],
    }),
    // ConfigModule.forRoot({ isGlobal: true }), // optional
    TypeOrmModule.forRoot(ormConfig),

    // repositories needed by LoggingService
    TypeOrmModule.forFeature([Log, LogType]),

    // Auth / Users
    AuthModule,
    UserModule,

    // RBAC / Navigation
    RoleModule,
    PermissionModule,
    MenuModule,

    // Domain
    FacilityModule,
    TeacherModule,
    SportModule,
    CourseModule,
    TournamentModule,
    BookingModule,

    // System
    LogModule,

    // Extra
    UploadModule,
    MetaModule,
    DashboardModule
  ],
  controllers: [],
  providers: [
    // Apply JWT guard to every route by default; mark public endpoints with @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    LoggingService,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
