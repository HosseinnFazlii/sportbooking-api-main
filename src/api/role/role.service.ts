import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BaseService } from '../../common/base.service';
import { Role } from '../../entities/role';
import { Permission } from '../../entities/permission';
import { RolePermission } from '../../entities/rolePermission';
import { User } from '../../entities/user';
import { Menu } from '../../entities/menu';

@Injectable()
export class RoleService extends BaseService<Role> {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rpRepo: Repository<RolePermission>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Menu) private readonly menuRepo: Repository<Menu>,
    dataSource: DataSource,
  ) {
    super(roleRepo, dataSource, {
      searchableColumns: ['name', 'description'],
      defaultSort: '+name',
    });
  }

  /** ----- permissions ----- */

  listPermissions() {
    return this.permRepo.find({ order: { name: 'ASC' } as any });
  }

  async rolePermissions(roleId: number) {
    return this['dataSource']
      .createQueryBuilder()
      .select(['p.id AS "id"', 'p.name AS "name"'])
      .from('role_permissions', 'rp')
      .innerJoin('permissions', 'p', 'p.id = rp.permission_id')
      .where('rp.role_id = :rid', { rid: roleId })
      .orderBy('"name"', 'ASC')
      .getRawMany();
  }

  async addPermissions(roleId: number, ids: number[]) {
    if (!ids.length) return true;
    const values = ids.map(id => `(${roleId}, ${id})`).join(',');
    try {
      await this['dataSource'].query(
        `INSERT INTO role_permissions(role_id, permission_id) VALUES ${values}
         ON CONFLICT DO NOTHING`
      );
      return true;
    } catch {
      throw new BadRequestException('Invalid permission ids');
    }
  }

  async removePermission(roleId: number, permissionId: number) {
    await this.rpRepo.delete({ roleId: roleId as any, permissionId: permissionId as any } as any);
    return true;
  }

  /** ----- menus (role_menus join) ----- */

  async roleMenus(roleId: number) {
    return this['dataSource']
      .createQueryBuilder()
      .select(['m.id AS "id"', 'm.name AS "name"', 'm.url AS "url"', 'm.icon AS "icon"', 'm.parent_id AS "parentId"'])
      .from('role_menus', 'rm')
      .innerJoin('menus', 'm', 'm.id = rm.menu_id')
      .where('rm.role_id = :rid', { rid: roleId })
      .orderBy('"name"', 'ASC')
      .getRawMany();
  }

  async addMenu(roleId: number, menuId: number) {
    // Ensure both exist:
    const [r, m] = await Promise.all([
      this.roleRepo.findOne({ where: { id: roleId } }),
      this.menuRepo.findOne({ where: { id: menuId } }),
    ]);
    if (!r || !m) throw new BadRequestException('Invalid role or menu');
    await this['dataSource'].query(
      `INSERT INTO role_menus(role_id, menu_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [roleId, menuId]
    );
    return true;
  }

  async removeMenu(roleId: number, menuId: number) {
    await this['dataSource'].query(
      `DELETE FROM role_menus WHERE role_id = $1 AND menu_id = $2`,
      [roleId, menuId]
    );
    return true;
  }

  /** ----- users of a role ----- */

  async roleUsers(roleId: number) {
    return this['dataSource']
      .createQueryBuilder()
      .select(['u.id AS "id"', 'u.name AS "name"'])
      .from('users', 'u')
      .where('u.role_id = :rid', { rid: roleId })
      .orderBy('"name"', 'ASC')
      .getRawMany();
  }

  async addUser(roleId: number, userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new BadRequestException('Role not found');
    await this.userRepo.update({ id: userId }, { roleId });
    return true;
  }

  async removeUser(roleId: number, userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return true;
    if (user.roleId === roleId) {
      await this.userRepo.update({ id: userId }, { roleId: null });
    }
    return true;
  }
}
