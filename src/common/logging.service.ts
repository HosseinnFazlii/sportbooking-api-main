import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Log } from '../entities/log';
import { LogType } from '../entities/logType';

export type LogCode =
  | 'API_ACCESS' | 'API_ERROR'
  | 'AUTH_LOGIN_SUCCESS' | 'AUTH_LOGIN_FAIL' | 'AUTH_CHANGE_PASSWORD'
  | 'AUTH_REQUEST_OTP' | 'AUTH_VERIFY_OTP_SUCCESS' | 'AUTH_VERIFY_OTP_FAIL';

@Injectable()
export class LoggingService {
  private cache = new Map<string, number>();

  constructor(
    @InjectRepository(Log) private readonly logRepo: Repository<Log>,
    @InjectRepository(LogType) private readonly logTypeRepo: Repository<LogType>,
  ) { }

  private async getTypeId(code: string): Promise<number> {
    const hit = this.cache.get(code);
    if (hit) return hit;
    const row = await this.logTypeRepo.findOne({ where: { code } });
    if (!row) {
      // fallback: create on the fly for unknown codes (keeps system resilient)
      const created = await this.logTypeRepo.save(
        this.logTypeRepo.create({ code, createdBy: 1 })
      );
      this.cache.set(code, created.id);
      return created.id;
    }
    this.cache.set(code, row.id);
    return row.id;
  }

  /**
   * Persist a log entry.
   * @param code    logical code (see LogCode)
   * @param params  userId/ip/message/details
   */
  async log(code: LogCode | string, params: {
    userId?: number | null;
    ip?: string | null;
    message?: string;
    details?: any;
  } = {}): Promise<void> {
    const logTypeId = await this.getTypeId(String(code));
    const { userId, ip, message, details } = params;
    const entity = this.logRepo.create({
      id: null,
      logTypeId,
      text1: message ?? String(code),
      text2: details ? JSON.stringify(details) : null,
      text3: ip ?? null,
      text4: null,
      createdBy: userId ?? 1,         // fallback to system/admin user id 1
      createdAt: new Date(),
    } as Log);
    await this.logRepo.save(entity);
  }
}
