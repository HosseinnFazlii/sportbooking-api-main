import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'v_logs' })
export class VLog {
  @ViewColumn()
  id: number;

  @ViewColumn({ name: 'type_id' })
  typeId: number | null;

  @ViewColumn({ name: 'type_code' })
  typeCode: string | null;

  @ViewColumn({ name: 'type_description' })
  typeDescription: string | null;

  @ViewColumn()
  text1: string | null;

  @ViewColumn()
  text2: string | null;

  @ViewColumn()
  text3: string | null;

  @ViewColumn()
  text4: string | null;

  @ViewColumn({ name: 'created_at' })
  createdAt: Date;

  @ViewColumn({ name: 'created_by' })
  createdBy: number | null;

  @ViewColumn({ name: 'created_by_name' })
  createdByName: string | null;
}
