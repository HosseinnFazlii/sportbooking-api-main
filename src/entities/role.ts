// src/entities/role.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany } from 'typeorm';
import { RolePermission } from './rolePermission';
import { FacilityStaff } from './facilityStaff';
import { Menu } from './menu';
import { User } from './user';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => RolePermission, (rp) => rp.role)
  rolePermissions: RolePermission[];

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @OneToMany(() => FacilityStaff, (fs) => fs.role)
  facilityStaff: FacilityStaff[];

  @ManyToMany(() => Menu, (menu) => menu.roles)
  menus: Menu[];
}
