import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmartCoupon } from './entities/smart-coupon.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FixtureOdd } from '../fixtures/entities/fixture-odd.entity';
import { EnabledLeague } from '../fixtures/entities/enabled-league.entity';
import { SmartCouponService } from './smart-coupon.service';
import { CouponsController } from './coupons.controller';
import { FixturesModule } from '../fixtures/fixtures.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmartCoupon,
      Fixture,
      FixtureOdd,
      EnabledLeague,
    ]),
    forwardRef(() => FixturesModule),
  ],
  controllers: [CouponsController],
  providers: [SmartCouponService],
  exports: [SmartCouponService],
})
export class CouponsModule { }
