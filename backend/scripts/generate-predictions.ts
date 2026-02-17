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
        const result = await service.runNow();
        logger.log(`Success! ${result.message}`);
    } catch (error) {
        logger.error('Error generating predictions', error);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
