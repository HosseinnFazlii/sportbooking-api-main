import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base.controller';
import { UserService } from './user.service';
import { User } from '../../entities/user';
import { VUser } from '../../entities/vUser';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController extends BaseController<User, VUser> {
  constructor(private readonly users: UserService) {
    super(users, 'user', {
      permissions: {
        list: ['user.read'],
        read: ['user.read'],
        create: ['user.create'],
        update: ['user.update'],
        delete: ['user.delete'],
      },
    });
  }

  @Get('email/:email')
  async byEmail(@Param('email') email: string) {
    return this.users.findOneByEmail(email, true);
  }

  @Get(':id')
  async findOne(@Param('id') id: number, @Req() request: any) {
    return this.users.findOnePasswordLess(id, request.user);
  }

  @Get('me/profile')
  async me(@Req() request: any) {
    const meId = request.user?.id;
    return this.users.findOnePasswordLess(meId, request.user);
  }
}
