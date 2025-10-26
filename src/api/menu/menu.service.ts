import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BaseService } from '../../common/base.service';
import { Menu } from '../../entities/menu';

export interface MenuNode {
  id: number;
  name: string;
  url?: string | null;
  icon?: string | null;
  parentId?: number | null;
  sortOrder: number;
  isActive: boolean;
  children: MenuNode[];
}

@Injectable()
export class MenuService extends BaseService<Menu> {
  constructor(
    @InjectRepository(Menu) private readonly menuRepo: Repository<Menu>,
    dataSource: DataSource,
  ) {
    super(menuRepo, dataSource, {
      searchableColumns: ['name', 'url', 'icon'],
      defaultSort: '+sortOrder,+name',
    });
  }

  /** Build hierarchical menu tree (active only by default). */
  async tree(includeInactive = false): Promise<MenuNode[]> {
    const rows = await this.menuRepo.createQueryBuilder('m')
      .where(includeInactive ? '1=1' : 'm.isActive = true')
      .orderBy('m.parentId', 'ASC')
      .addOrderBy('m.sortOrder', 'ASC')
      .addOrderBy('m.name', 'ASC')
      .getMany();

    const map = new Map<number, MenuNode>();
    const roots: MenuNode[] = [];
    for (const r of rows) {
      map.set(r.id as any, { id: r.id as any, name: r.name, url: r.url, icon: r.icon, parentId: r.parentId as any, sortOrder: r.sortOrder, isActive: r.isActive, children: [] });
    }
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  menusByRole(roleId: number) {
    return this['dataSource'].createQueryBuilder()
      .select(['m.id AS "id"', 'm.name AS "name"', 'm.url AS "url"', 'm.icon AS "icon"', 'm.parent_id AS "parentId"', 'm.sort_order AS "sortOrder"'])
      .from('role_menus', 'rm')
      .innerJoin('menus', 'm', 'm.id = rm.menu_id')
      .where('rm.role_id = :rid', { rid: roleId })
      .orderBy('"sortOrder"', 'ASC')
      .addOrderBy('"name"', 'ASC')
      .getRawMany();
  }

  menusByUser(userId: number) {
    return this['dataSource'].createQueryBuilder()
      .select(['DISTINCT m.id AS "id"', 'm.name AS "name"', 'm.url AS "url"', 'm.icon AS "icon"', 'm.parent_id AS "parentId"', 'm.sort_order AS "sortOrder"'])
      .from('users', 'u')
      .innerJoin('role_menus', 'rm', 'rm.role_id = u.role_id')
      .innerJoin('menus', 'm', 'm.id = rm.menu_id')
      .where('u.id = :uid', { uid: userId })
      .orderBy('"sortOrder"', 'ASC')
      .addOrderBy('"name"', 'ASC')
      .getRawMany();
  }

  async addRole(menuId: number, roleId: number) {
    // validate menu
    const menu = await this.menuRepo.findOne({ where: { id: menuId } });
    if (!menu) throw new BadRequestException('Menu not found');
    await this['dataSource'].query(
      `INSERT INTO role_menus(role_id, menu_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [roleId, menuId]
    );
    return true;
  }

  async removeRole(menuId: number, roleId: number) {
    await this['dataSource'].query(
      `DELETE FROM role_menus WHERE role_id = $1 AND menu_id = $2`,
      [roleId, menuId]
    );
    return true;
  }
}
