import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { jwtConstants } from './constants';

import { User } from '../../entities/user';
import { AuthOtp } from '../../entities/authOtp';
import { Session } from '../../entities/session';

@Module({
  imports: [
    // Register database entities used by the Auth module
    TypeOrmModule.forFeature([User, AuthOtp, Session]),

    // Configure Passport for JWT authentication
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Configure JWT module
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: {
        /**
         * We explicitly cast to `any` so TypeScript accepts
         * the string duration format (e.g., "1d", "60s").
         * This does not affect runtime behavior.
         */
        expiresIn: jwtConstants.expiresIn as any,
      },
    }),
  ],

  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
