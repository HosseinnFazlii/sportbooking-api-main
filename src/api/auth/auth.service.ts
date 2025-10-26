import { Injectable, UnauthorizedException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entities/user';
import { AuthOtp } from '../../entities/authOtp';
import { Session } from '../../entities/session';
import { comparePassword, hashPassword } from '../../utils/password-helper';
import { normalizeMobile } from '../../utils/phone.util';
import { jwtConstants } from './constants';
import { Role } from '../../entities/role';
import { Menu } from '../../entities/menu';
import { UserService } from '../user/user.service';
// import { LoggingService } from '../../common/logging.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AuthOtp) private readonly otpRepo: Repository<AuthOtp>,
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    private readonly dataSource: DataSource,
    // private readonly logger: LoggingService,


    // private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) { }

  /** ------- Password login ------- */
  async validateUserByPassword(dto: { mobile: number }, password: string, ip?: string) {
    // Load role + menus relations so we can return roles and their menus
    const user = await this.userRepo.findOne({
      where: { mobile: dto.mobile, deletedAt: null },
      relations: ['role', 'role.menus'],
    });

    if (!user || !user.isActive || user.deletedAt) {
      // await this.logger.log('AUTH_LOGIN_FAIL', {
      //   userId: user?.id ?? null,
      //   ip,
      //   message: 'Login failed',
      //   details: { mobile: mobileOrPair.mobile },
      // });
      return null;
    }
    if (!comparePassword(password, user.passwordHash)) {
      // await this.logger.log('AUTH_LOGIN_FAIL', {
      //   userId: user?.id ?? null,
      //   ip,
      //   message: 'Login failed',
      //   details: { mobile: mobileOrPair.mobile },
      // });
      return null;
    }

    // Structured app log
    // await this.logger.log('AUTH_LOGIN_SUCCESS', {
    //   userId: user.id,
    //   ip,
    //   message: 'Login success',
    //   details: { mobile: mobileOrPair.mobile },
    // });

    await this.createSession(user.id, ip);
    return this.sanitize(user);
  }

  /** ------- OTP flow ------- */
  async requestOtp(
    input: { mobile: number },
    purpose: 'login' | 'register' | 'reset',
    ip?: string,
  ): Promise<{ ok: true; expiresAt: Date }> {

    // Small rate-limit: reuse valid unconsumed OTP if not expired; otherwise create a fresh one
    const existing = await this.otpRepo.findOne({
      where: { mobile: input.mobile, purpose, consumedAt: null },
      order: { expiresAt: 'DESC' },
    });
    const now = new Date();
    if (existing && existing.expiresAt > now) {
      return { ok: true, expiresAt: existing.expiresAt };
    }

    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const otp = this.otpRepo.create({
      mobile: input.mobile,
      code, purpose,
      issuedAt: now, expiresAt, attempts: 0, requestIp: ip as any,
      maxAttempts: 5,
    });
    await this.otpRepo.save(otp);
    // TODO: integrate SMS provider here
    return { ok: true, expiresAt };
  }

  async verifyOtp(
    input: { mobile: number },
    code: string,
    purpose: 'login' | 'register' | 'reset',
    ip?: string,
  ): Promise<{ ok: true; user?: any }> {
    const otp = await this.otpRepo.findOne({
      where: { mobile: input.mobile, purpose, consumedAt: null },
      order: { expiresAt: 'DESC' },
    });
    const now = new Date();
    if (!otp) throw new BadRequestException('No OTP requested');
    if (otp.expiresAt <= now) throw new BadRequestException('OTP expired');

    if (otp.attempts >= otp.maxAttempts) throw new BadRequestException('OTP attempts exceeded');
    if (otp.code !== code) {
      await this.otpRepo.update({ id: otp.id }, { attempts: otp.attempts + 1 });
      throw new BadRequestException('Invalid OTP code');
    }

    await this.otpRepo.update({ id: otp.id }, { consumedAt: now });

    // Mark user mobile as verified if exists
    const user = await this.userRepo.findOne({ where: { mobile: input.mobile } });
    if (user) {
      if (!user.mobileVerified) {
        await this.userRepo.update({ id: user.id }, { mobileVerified: true });
      }
      await this.createSession(user.id, ip);
      return { ok: true, user: this.sanitize(user) };
    }
    return { ok: true };
  }

  /** ------- Registration (requires OTP) ------- */
  async register(dto: {
    mobile: number;
    name: string;
    email?: string;
    password?: string;
    otpCode: string;
    marketingOptIn?: boolean;
  }, ip?: string): Promise<{ access_token: string; user: any }> {

    // Validate OTP
    await this.verifyOtp({ mobile: dto.mobile }, dto.otpCode, 'register', ip);

    // Create user if not exists
    let user = await this.userRepo.findOne({ where: { mobile: dto.mobile } });
    if (!user) {
      const normalizedName = dto.name?.trim();
      if (!normalizedName) throw new BadRequestException('Name is required');

      user = this.userRepo.create({
        mobile: dto.mobile,
        name: normalizedName,
        email: dto.email?.toLowerCase() ?? null,
        passwordHash: dto.password ? hashPassword(dto.password) : null,
        passwordSetAt: dto.password ? new Date() : null,
        marketingOptIn: !!dto.marketingOptIn,
        mobileVerified: true,
        isActive: true,
      });
      try {
        user = await this.userRepo.save(user);
      } catch (e) {
        throw new BadRequestException('User already exists or invalid data');
      }
    }

    await this.createSession(user.id, ip);
    const token = await this.signJwt(user.id);
    return { access_token: token, user: this.sanitize(user) };
  }

  /** ------- Change password (JWT required) ------- */
  async changePassword(userJwt: any, currentPassword: string, newPassword: string, ip?: string): Promise<boolean> {
    const me = await this.userRepo.findOne({ where: { id: userJwt.id } });
    if (!me || !me.isActive) {
      // await this.logger.log('AUTH_CHANGE_PASSWORD', {
      //   userId: me?.id ?? null,
      //   ip,
      //   message: 'Change password failed (wrong current password)',
      // });
      throw new UnauthorizedException();
    }
    if (!comparePassword(currentPassword, me.passwordHash)) {
      // await this.logger.log('AUTH_CHANGE_PASSWORD', {
      //   userId: me?.id ?? null,
      //   ip,
      //   message: 'Change password failed (wrong current password)',
      // });
      return false;
    }

    // await this.logger.log('AUTH_CHANGE_PASSWORD', {
    //   userId: me.id,
    //   ip,
    //   message: 'Change password success',
    // });

    await this.userRepo.update({ id: me.id }, {
      passwordHash: hashPassword(newPassword),
      passwordSetAt: new Date(),
      passwordMustChange: false,
    });
    await this.createSession(me.id, ip);
    return true;
  }

  /** ------- JWT helpers ------- */
  private async signJwt(userId: number): Promise<string> {
    const roles = await this.dataSource.createQueryBuilder()
      .select('r.name', 'name')
      .from('users', 'u')
      .innerJoin('roles', 'r', 'r.id = u.role_id')
      .where('u.id = :uid', { uid: userId })
      .getRawMany<{ name: string }>();
    const payload = { sub: userId, roles: roles.map(r => r.name) };
    return this.jwtService.sign(payload, { secret: jwtConstants.secret, expiresIn: jwtConstants.expiresIn });
    // NOTE: sessions table is maintained separately for device tracking / revocation lists if you want to use it
  }

  private async createSession(userId: number, ip?: string) {
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    await this.sessionRepo.save(this.sessionRepo.create({
      userId,
      expiresAt,
      ip: ip as any,
    }));
  }

  /**
   * Pick a primary role for the user.
   * Strategy: earliest assigned role (assignedAt asc), falling back to lowest role.id.
   * Adjust here if you prefer a precedence map.
   */
  private getPrimaryRole(u: User): Role | undefined {
    return u.role ?? undefined;
  }

  private collectMenus(roles: Role[]): Array<{
    id: number;
    name: string;
    url: string | null;
    icon: string | null;
    parentId: number | null;
  }> {
    const map = new Map<number, Menu>();
    for (const r of roles) {
      const menus = (r as any)?.menus as Menu[] | undefined;
      if (!menus) continue;
      for (const m of menus) {
        const id = (m as any)?.menuId ?? (m as any)?.id;
        if (!id) continue;
        map.set(id, m);
      }
    }
    const flat = Array.from(map.values()).map((m) => ({
      id: (m as any)?.menuId ?? (m as any)?.id,
      sort_order: (m as any)?.sort_order ?? 0,
      name: (m as any)?.name ?? null,
      url: (m as any)?.url ?? null,
      icon: (m as any)?.icon ?? null,
      parentId: (m as any)?.parentId ?? null,
    })).sort((a, b) => a.sort_order - b.sort_order);
    // Optional: stable sort by name then id
    // flat.sort((a, b) => (a.name || '').localeCompare(b.name || '') || a.id - b.id);
    return flat;
  }

  /** Build a simple tree from a flat menu list (parentId references within the same list) */
  private buildMenuTree(menus: Array<{ id: number; name: string; url: string | null; icon: string | null; parentId: number | null }>) {
    const byId = new Map<number, any>(menus.map((m) => [m.id, { ...m, children: [] as any[] }]));
    const roots: any[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }
    // sort children by name for predictable UI
    const sortChildren = (arr: any[]) => {
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || '') || a.id - b.id);
      arr.forEach((n) => sortChildren(n.children));
    };
    sortChildren(roots);
    return roots;
  }

  private sanitize(u: User) {
    const primaryRole = this.getPrimaryRole(u);
    const roles = u.role ? [u.role] : [];
    const rolesLite = roles.map((r) => ({
      id: (r as any)?.id as number,
      name: (r as any)?.name as string,
    }));
    const menus = this.collectMenus(roles);
    const menuTree = this.buildMenuTree(menus);

    return {
      id: u.id,
      name: u.name,
      genderId: u.genderId,
      email: u.email ?? null,
      mobile: u.mobile,
      mobileVerified: u.mobileVerified,
      picture: this.pictureToBase64(u.picture),
      countryId: u.countryId,
      stateId: u.stateId,
      cityId: u.cityId,
      birthdate: u.birthdate,
      // ↓ primary role (for quick checks on client)
      roleId: primaryRole ? (primaryRole as any).id : null,
      roleName: primaryRole ? (primaryRole as any).name : null,
      // ↓ full role list and deduped menus
      roles: rolesLite,
      menus,
      // optional: hierarchical structure (use if your UI needs tree)
      menuTree,
      isActive: u.isActive,
    };
  }

  private pictureToBase64(picture: any): string | null {
    if (!picture) return null;
    if (typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function' && Buffer.isBuffer(picture)) {
      return picture.toString('base64');
    }
    if (picture instanceof Uint8Array) {
      return Buffer.from(picture).toString('base64');
    }
    return typeof picture === 'string' ? picture : null;
  }
}
