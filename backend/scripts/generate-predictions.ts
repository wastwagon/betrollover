import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PredictionEngineService } from '../src/modules/predictions/prediction-engine.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const logger = new Logger('GeneratePredictionsScript');
    const service = app.get(PredictionEngineService);

    try {
        logger.log('Starting manual AI Prediction generation...');
        const predictions = await service.generateDailyPredictionsForAllTipsters();
        logger.log(`Generated ${predictions.length} coupons (2-pick accas).`);
        if (predictions.length > 0) {
            logger.log('Tipsters that got a coupon:');
            predictions.forEach((p) => {
                logger.log(`  - ${p.tipsterDisplayName} (${p.tipsterUsername}): combined odds ${p.combinedOdds?.toFixed(2)}, source: ${p.source}`);
            });
        } else {
            logger.warn('No coupons generated. Check: fixtures with odds in next 7 days, API-Football key, and generation logs.');
        }
    } catch (error) {
        logger.error('Error generating predictions', error);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
