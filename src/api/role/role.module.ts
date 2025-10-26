import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../entities/role';
import { Permission } from '../../entities/permission';
import { RolePermission } from '../../entities/rolePermission';
import { User } from '../../entities/user';
import { Menu } from '../../entities/menu';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission, User, Menu])],
  providers: [RoleService],
  controllers: [RoleController],
  exports: [RoleService],
})
export class RoleModule {}
