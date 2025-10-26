import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user';

const pictureToBase64 = (picture: any): string | null => {
  if (!picture) return null;
  if (typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function' && Buffer.isBuffer(picture)) {
    return picture.toString('base64');
  }
  if (picture instanceof Uint8Array) {
    return Buffer.from(picture).toString('base64');
  }
  return typeof picture === 'string' ? picture : null;
};

export interface JwtPayload {
  sub: number;          // user id
  roles?: string[];     // optional role names
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConstants.secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.deletedAt) throw new UnauthorizedException();
    // return what becomes request.user
    return {
      id: user.id,
      name: user.name,
      email: user.email ?? null,
      mobile: user.mobile,
      picture: pictureToBase64(user.picture),
      roles: payload.roles ?? [],
    };
  }
}
