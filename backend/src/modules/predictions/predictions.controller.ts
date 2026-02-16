import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { PredictionsApiService } from './predictions-api.service';

@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsApi: PredictionsApiService) {}

  @Get('today')
  async getTodaysPredictions() {
    const result = await this.predictionsApi.getTodaysPredictions();
    return {
      date: result.date,
      count: result.predictions.length,
      predictions: result.predictions,
    };
  }

  @Get(':id')
  async getPredictionDetails(@Param('id', ParseIntPipe) id: number) {
    const result = await this.predictionsApi.getPredictionDetails(id);
    if (!result) {
      throw new NotFoundException('Prediction not found');
    }
    return result;
  }
}
