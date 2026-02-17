import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SmartCouponService } from '../src/modules/coupons/smart-coupon.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const logger = new Logger('GenerateCouponsScript');
    const service = app.get(SmartCouponService);

    try {
        logger.log('Starting manual Smart Coupon generation...');
        const result = await service.generateCoupons();
        logger.log(`Success! Generated ${result.length} coupons.`);
    } catch (error) {
        logger.error('Error generating coupons', error);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
