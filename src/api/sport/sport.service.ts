import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BaseService } from '../../common/base.service';
import { Sport } from '../../entities/sport';

@Injectable()
export class SportService extends BaseService<Sport> {
  constructor(
    @InjectRepository(Sport) private readonly sportRepo: Repository<Sport>,
    dataSource: DataSource,
  ) {
    super(sportRepo, dataSource, {
      searchableColumns: ['code', 'name'],
      defaultSort: '+name',
      // has deletedAt, BaseService auto‑filters if present
    });
  }

  listActive() {
    return this.sportRepo.find({ where: { isActive: true } as any, order: { name: 'ASC' } as any });
  }

  async toggleActive(id: number) {
    const s = await this.sportRepo.findOne({ where: { id } });
    if (!s) return { data: false, error: 'Not found' };
    await this.sportRepo.update({ id }, { isActive: !s.isActive } as any);
    return { data: true };
  }
}
