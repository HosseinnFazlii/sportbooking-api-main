import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base.controller';
import { Menu } from '../../entities/menu';
import { MenuService } from './menu.service';
import { AssignRoleDto } from './dto/assign-role.dto';

@ApiTags('menu')
@ApiBearerAuth()
@Controller('menu')
export class MenuController extends BaseController<Menu> {
  constructor(private readonly menus: MenuService) {
    super(menus, 'menu', {
      permissions: {
        list: ['menu.read'],
        read: ['menu.read'],
        create: ['menu.create'],
        update: ['menu.update'],
        delete: ['menu.delete'],
      },
    });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Hierarchical menu tree (active only by default)' })
  tree(@Query('includeInactive') includeInactive?: string) {
    return this.menus.tree(includeInactive === 'true');
  }

  @Get('role/:roleId')
  menusByRole(@Param('roleId') roleId: number) {
    return this.menus.menusByRole(+roleId);
  }

  @Get('user/:userId')
  menusByUser(@Param('userId') userId: number) {
    return this.menus.menusByUser(+userId);
  }

  @Post(':id/roles')
  addRole(@Param('id') id: number, @Body() dto: AssignRoleDto) {
    return this.menus.addRole(+id, dto.roleId);
  }

  @Delete(':id/roles/:roleId')
  removeRole(@Param('id') id: number, @Param('roleId') roleId: number) {
    return this.menus.removeRole(+id, +roleId);
  }

  @Get('me')
  me(@Req() req: any) {
    return this.menus.menusByUser(Number(req?.user?.id));
  }
}
