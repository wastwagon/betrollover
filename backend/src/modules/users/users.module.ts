import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { TipsterRequest } from './entities/tipster-request.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AgeVerifiedGuard } from '../auth/guards/age-verified.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, TipsterRequest, Tipster])],
  controllers: [UsersController],
  providers: [UsersService, AgeVerifiedGuard],
  exports: [UsersService, AgeVerifiedGuard],
})
export class UsersModule {}
