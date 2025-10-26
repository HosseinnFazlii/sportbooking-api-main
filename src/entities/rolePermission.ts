// src/entities/rolePermission.ts
import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role';
import { Permission } from './permission';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn({ type: 'smallint', name: 'role_id' })
  roleId: number;

  @PrimaryColumn({ type: 'bigint', name: 'permission_id' })
  permissionId: number;

  @ManyToOne(() => Role, (r) => r.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Permission, (p) => p.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;
}
