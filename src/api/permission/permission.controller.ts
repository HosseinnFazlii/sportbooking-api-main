import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionService } from './permission.service';

@ApiTags('permission')
@ApiBearerAuth()
@Controller('permission')
export class PermissionController {
  constructor(private readonly perms: PermissionService) {}
  @Get() findAll() { return this.perms.findAll(); }
}
