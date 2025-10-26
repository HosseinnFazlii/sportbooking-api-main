import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BaseService } from '../../common/base.service';
import { Log } from '../../entities/log';
import { LogType } from '../../entities/logType';
import { VLog } from '../../entities/vLog';

@Injectable()
export class LogService extends BaseService<Log> {
  constructor(
    @InjectRepository(Log) private readonly logRepo: Repository<Log>,
    @InjectRepository(LogType) private readonly typeRepo: Repository<LogType>,
    @InjectRepository(VLog) private readonly vLogRepo: Repository<VLog>,
    dataSource: DataSource,
  ) {
    super(logRepo, dataSource, {
      searchableColumns: ['text1', 'text2', 'text3', 'text4'],
      defaultSort: '-createdAt',
    });
  }

  listTypes() {
    return this.typeRepo.find({ order: { name: 'ASC' } as any });
  }

  async createType(dto: Partial<LogType>) {
    return this.typeRepo.save(this.typeRepo.create(dto));
  }

  /** Read‑only aggregated view */
  async listVLogs(query?: any) {
    const qb = this.vLogRepo.createQueryBuilder('v');
    // optional basic filters: typeId, createdBy, createdAt range:
    if (query?.typeId) qb.andWhere('v.typeId = :tid', { tid: +query.typeId });
    if (query?.createdBy) qb.andWhere('v.createdBy = :cb', { cb: +query.createdBy });
    if (query?.from) qb.andWhere('v.createdAt >= :from', { from: new Date(query.from) });
    if (query?.to) qb.andWhere('v.createdAt <= :to', { to: new Date(query.to) });
    qb.orderBy('v.createdAt', 'DESC');
    return qb.getMany();
  }
}
