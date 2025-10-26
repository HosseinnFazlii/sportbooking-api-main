import { Body, Controller, Ip, Post, Put, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginPasswordDto } from './dto/login-password.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with mobile + password' })
  @ApiBody({ type: LoginPasswordDto })
  async login(@Body() dto: LoginPasswordDto, @Ip() ip: string) {
    const user = await this.auth.validateUserByPassword(dto, dto.password, ip);
    
    if (!user) throw new UnauthorizedException();
    return { access_token: await this['auth']['signJwt'](user.id), user };
  }

  @Public()
  @Post('request-otp')
  @ApiOperation({ summary: 'Request OTP for login/register/reset' })
  @ApiBody({ type: RequestOtpDto })
  async requestOtp(@Body() dto: RequestOtpDto, @Ip() ip: string) {
    return this.auth.requestOtp(dto, dto.purpose, ip);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP; on login returns token+user if exists' })
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(@Body() dto: VerifyOtpDto, @Ip() ip: string) {
    const out = await this.auth.verifyOtp(dto, dto.code, dto.purpose, ip);
    if (dto.purpose === 'login' && out.user) {
      return { access_token: await this['auth']['signJwt'](out.user.id), user: out.user };
    }
    return out;
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user (requires OTP code with purpose=register)' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() dto: RegisterDto, @Ip() ip: string) {
    return this.auth.register(dto, ip);
  }

  @ApiBearerAuth()
  @Put('change-password')
  @ApiOperation({ summary: 'Change password (JWT required)' })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(@Body() dto: ChangePasswordDto, @Ip() ip: string, @Req() req: any) {
    return this.auth.changePassword(req.user, dto.password, dto.newPassword, ip);
  }
}
