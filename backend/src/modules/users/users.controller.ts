import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: User, @Body() body: { displayName?: string; phone?: string }) {
    return this.usersService.updateProfile(user.id, body);
  }

  @Post('me/request-tipster')
  @UseGuards(JwtAuthGuard)
  async requestTipster(@CurrentUser() user: User) {
    return this.usersService.requestTipster(user.id);
  }

  @Get('me/tipster-request')
  @UseGuards(JwtAuthGuard)
  async getTipsterRequest(@CurrentUser() user: User) {
    return this.usersService.getMyTipsterRequest(user.id);
  }
}
