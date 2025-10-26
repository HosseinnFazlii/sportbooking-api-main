import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { BaseService } from '../../common/base.service';
import { IApiResponse } from '../../types/response';
import { User } from '../../entities/user';
import { VUser } from '../../entities/vUser';
import { hashPassword } from '../../utils/password-helper';

@Injectable()
export class UserService extends BaseService<User, VUser> {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(VUser) vUserRepository: Repository<VUser>,
    public readonly dataSource: DataSource,
  ) {
    super(userRepository, dataSource, {
      searchableColumns: ['name', 'email', 'mobile', 'countryName', 'roles'],
      userScope: { enabled: true, userIdProperty: 'id' }, // non-admins see themselves
      defaultSort: '-createdAt',
      list: { repo: vUserRepository, alias: 'vu' },
    });
  }

  async findOneByEmail(email: string, safe = false): Promise<User | null> {
    const ret = await this.userRepository.findOne({ where: { email: email?.toLowerCase() } });
    if (!ret) return null;
    return safe ? this.stripSensitive(ret) : ret;
  }

  async findOneByMobile(mobile: number, safe = false): Promise<User | null> {
    const ret = await this.userRepository.findOne({ where: { mobile } });
    if (!ret) return null;
    return safe ? this.stripSensitive(ret) : ret;
  }

  async findOnePasswordLess(id: number, userJwt?: any): Promise<User> {
    const ret = await super.findOne(id, userJwt);
    return this.stripSensitive(ret as User);
  }

  /** Create/Update with password hashing & basic validations */
  async create(dto: Partial<User>, requester?: any): Promise<IApiResponse<User>> {
    // normalize & validations
    if (dto.email) dto.email = (dto.email as string).toLowerCase();
    if (dto.passwordHash) delete dto.passwordHash; // never allow raw injection
    if ((dto as any).password) {
      (dto as any).passwordHash = hashPassword((dto as any).password);
      delete (dto as any).password;
    }

    try {
      const saved = await this.userRepository.save(dto as any);
      return { data: this.stripSensitive(saved) };
    } catch (e) {
      return { data: null as any, error: 'Failed to create user (duplicate or invalid fields)' };
    }
  }

  async update(id: number, dto: any, requester?: any): Promise<IApiResponse<User>> {
    const record = await this.userRepository.findOne({ where: { id } });
    if (!record) return { data: null as any, error: 'Record not found' };

    if (dto.email) dto.email = String(dto.email).toLowerCase();
    delete dto.passwordHash;
    delete dto.id;
    delete dto.createdAt;
    delete dto.deletedAt;

    if (dto.password && String(dto.password).length >= 6) {
      dto.passwordHash = hashPassword(String(dto.password));
      dto.passwordSetAt = new Date();
      delete dto.password;
    }

    // avoid mobile uniqueness violation
    if (dto.mobile) {
      const dupe = await this.userRepository.findOne({
        where: {
          mobile: dto.mobile,
          id: Not(id),
        },
      });
      if (dupe) return { data: null as any, error: 'Duplicate mobile' };
    }

    await this.userRepository.update({ id }, dto);
    const updated = await this.userRepository.findOne({ where: { id } });
    return { data: this.stripSensitive(updated!) };
  }

  private stripSensitive(u: User): any {
    if (!u) return u;
    const { passwordHash, picture, ...rest } = u as any;
    return { ...rest, picture: picture ? picture.toString('base64') : null };
  }
}
