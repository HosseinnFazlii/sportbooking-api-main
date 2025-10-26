import { Controller, Get, Query, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('dashboard')
@ApiBearerAuth() // uses default "bearer" scheme (Option A)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @ApiOperation({ summary: 'Dashboard KPIs, breakdowns and trends' })
  @Get()
  async getDashboard(@Req() req: any, @Query('year') year?: string) {
    return this.svc.getDashboardData(req.user, year ? Number(year) : undefined);
  }

  @ApiOperation({ summary: 'Recent activities for current user' })
  @Get('activities')
  async activities(@Req() req: any) {
    return this.svc.getActivityData(req.user);
  }
}
