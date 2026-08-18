import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { SmtpSettings } from './entities/smtp-settings.entity';
import { MarketingSend } from './entities/marketing-send.entity';
import { User } from '../users/entities/user.entity';
import { UserPurchasedPick } from '../accumulators/entities/user-purchased-pick.entity';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { PickMarketplace } from '../accumulators/entities/pick-marketplace.entity';
import { UsersModule } from '../users/users.module';
import { TipsterFollow } from '../predictions/entities/tipster-follow.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { MarketingCampaignService } from './marketing-campaign.service';
import { MarketingCampaignScheduler } from './marketing-campaign.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmtpSettings,
      MarketingSend,
      User,
      UserPurchasedPick,
      AccumulatorTicket,
      PickMarketplace,
      TipsterFollow,
      Tipster,
    ]),
    forwardRef(() => UsersModule),
  ],
  providers: [EmailService, MarketingCampaignService, MarketingCampaignScheduler],
  exports: [EmailService, MarketingCampaignService],
})
export class EmailModule {}
