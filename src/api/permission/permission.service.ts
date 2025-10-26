import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../entities/permission';

@Injectable()
export class PermissionService {
  constructor(@InjectRepository(Permission) private readonly repo: Repository<Permission>) {}
  findAll() { return this.repo.find({ order: { name: 'ASC' } as any }); }
}
