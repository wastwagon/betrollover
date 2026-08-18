import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { RolloverDeskService } from './rollover-desk.service';

@Controller('rollover')
@UseGuards(ThrottlerGuard)
export class RolloverDeskController {
  constructor(private readonly rollover: RolloverDeskService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getBoard(@CurrentUser() user?: User | null) {
    return this.rollover.getBoard(user?.id);
  }
}
