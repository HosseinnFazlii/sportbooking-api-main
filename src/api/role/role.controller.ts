import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base.controller';
import { RoleService } from './role.service';
import { Role } from '../../entities/role';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { AssignMenuDto } from './dto/assign-menu.dto';

@ApiTags('role')
@ApiBearerAuth()
@Controller('role')
export class RoleController extends BaseController<Role> {
  constructor(private readonly roles: RoleService) {
    super(roles, 'role', {
      permissions: {
        list: ['role.read'],
        read: ['role.read'],
        create: ['role.create'],
        update: ['role.update'],
        delete: ['role.delete'],
      },
    });
  }

  // ---- permissions ----
  @Get('permissions/all')
  @ApiOperation({ summary: 'List all permissions' })
  listPermissions() {
    return this.roles.listPermissions();
  }

  @Get(':id/permissions')
  rolePermissions(@Param('id') id: number) {
    return this.roles.rolePermissions(+id);
  }

  @Post(':id/permissions')
  addPerms(@Param('id') id: number, @Body() dto: AssignPermissionDto) {
    const ids = dto.permissionIds ?? (dto.permissionId ? [dto.permissionId] : []);
    return this.roles.addPermissions(+id, ids);
  }

  @Delete(':id/permissions/:permissionId')
  removePerm(@Param('id') id: number, @Param('permissionId') permissionId: number) {
    return this.roles.removePermission(+id, +permissionId);
  }

  // ---- menus ----
  @Get(':id/menus')
  roleMenus(@Param('id') id: number) {
    return this.roles.roleMenus(+id);
  }

  @Post(':id/menus')
  addMenu(@Param('id') id: number, @Body() dto: AssignMenuDto) {
    return this.roles.addMenu(+id, dto.menuId);
  }

  @Delete(':id/menus/:menuId')
  removeMenu(@Param('id') id: number, @Param('menuId') menuId: number) {
    return this.roles.removeMenu(+id, +menuId);
  }

  // ---- users ----
  @Get(':id/users')
  roleUsers(@Param('id') id: number) {
    return this.roles.roleUsers(+id);
  }

  @Post(':id/users')
  addUser(@Param('id') id: number, @Body() dto: AssignUserDto) {
    return this.roles.addUser(+id, dto.userId);
  }

  @Delete(':id/users/:userId')
  removeUser(@Param('id') id: number, @Param('userId') userId: number) {
    return this.roles.removeUser(+id, +userId);
  }
}
