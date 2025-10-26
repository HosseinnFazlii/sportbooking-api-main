// src/entities/auditRowChange.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'row_changes', schema: 'audit' })
export class AuditRowChange {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', name: 'table_name' })
  tableName: string;

  @Column({ type: 'text' })
  op: 'INSERT' | 'UPDATE' | 'DELETE';

  @Column({ type: 'hstore', name: 'row_pk', nullable: true })
  rowPk?: Record<string, string>;

  @Column({ type: 'bigint', name: 'changed_by', nullable: true })
  changedBy?: number;

  @Column({ type: 'timestamptz', name: 'changed_at', default: () => 'now()' })
  changedAt: Date;

  @Column({ type: 'bigint' })
  txid: number;

  @Column({ type: 'jsonb', name: 'old_data', nullable: true })
  oldData?: any;

  @Column({ type: 'jsonb', name: 'new_data', nullable: true })
  newData?: any;
}
