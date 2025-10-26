import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany,
  ManyToMany, JoinTable, CreateDateColumn
} from 'typeorm';
import { User } from './user';
import { Role } from './role';

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  url?: string;

  @Column({ type: 'text', nullable: true })
  icon?: string;

  @Column({ type: 'bigint', name: 'parent_id', nullable: true })
  parentId?: number;

  @ManyToOne(() => Menu, (m) => m.children, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: Menu;

  @OneToMany(() => Menu, (m) => m.parent)
  children: Menu[];

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'bigint', name: 'created_by', nullable: true })
  createdBy?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  // Role mapping (with explicit join table)
  @ManyToMany(() => Role, (role) => role.menus)
  @JoinTable({
    name: 'role_menus',
    joinColumn: { name: 'menu_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}
