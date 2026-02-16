import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prediction } from './entities/prediction.entity';
import { PredictionFixture } from './entities/prediction-fixture.entity';
import { Tipster } from './entities/tipster.entity';

@Injectable()
export class PredictionsApiService {
  constructor(
    @InjectRepository(Prediction)
    private predictionRepo: Repository<Prediction>,
    @InjectRepository(PredictionFixture)
    private predictionFixtureRepo: Repository<PredictionFixture>,
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
  ) {}

  async getTodaysPredictions() {
    const today = new Date().toISOString().slice(0, 10);

    const predictions = await this.predictionRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.tipster', 't')
      .where('p.prediction_date = :date', { date: today })
      .andWhere("p.status = 'pending'")
      .orderBy('p.combinedOdds', 'ASC')
      .getMany();

    const enriched = await Promise.all(
      predictions.map(async (p) => {
        const fixtures = await this.predictionFixtureRepo.find({
          where: { predictionId: p.id },
          order: { legNumber: 'ASC' },
        });
        return {
          id: p.id,
          prediction_title: p.predictionTitle,
          combined_odds: Number(p.combinedOdds),
          stake_units: Number(p.stakeUnits),
          confidence_level: p.confidenceLevel,
          status: p.status,
          prediction_date: p.predictionDate,
          posted_at: p.postedAt,
          username: (p.tipster as Tipster).username,
          display_name: (p.tipster as Tipster).displayName,
          avatar_url: (p.tipster as Tipster).avatarUrl,
          roi: Number((p.tipster as Tipster).roi),
          win_rate: Number((p.tipster as Tipster).winRate),
          fixtures: fixtures.map((f) => ({
            id: f.id,
            fixture_id: f.fixtureId,
            match_date: f.matchDate,
            league_name: f.leagueName,
            home_team: f.homeTeam,
            away_team: f.awayTeam,
            selected_outcome: f.selectedOutcome,
            selection_odds: Number(f.selectionOdds),
            result_status: f.resultStatus,
            leg_number: f.legNumber,
          })),
        };
      }),
    );

    return {
      date: today,
      predictions: enriched,
    };
  }

  async getPredictionDetails(predictionId: number) {
    const prediction = await this.predictionRepo.findOne({
      where: { id: predictionId },
      relations: ['tipster'],
    });
    if (!prediction) return null;

    await this.predictionRepo.increment({ id: predictionId }, 'views', 1);

    const fixtures = await this.predictionFixtureRepo.find({
      where: { predictionId },
      order: { legNumber: 'ASC' },
    });

    return {
      prediction: {
        id: prediction.id,
        tipster_id: prediction.tipsterId,
        prediction_title: prediction.predictionTitle,
        combined_odds: Number(prediction.combinedOdds),
        stake_units: Number(prediction.stakeUnits),
        confidence_level: prediction.confidenceLevel,
        status: prediction.status,
        prediction_date: prediction.predictionDate,
        posted_at: prediction.postedAt,
        settled_at: prediction.settledAt,
        actual_result: prediction.actualResult != null ? Number(prediction.actualResult) : null,
        username: (prediction.tipster as Tipster).username,
        display_name: (prediction.tipster as Tipster).displayName,
        avatar_url: (prediction.tipster as Tipster).avatarUrl,
      },
      fixtures: fixtures.map((f) => ({
        id: f.id,
        fixture_id: f.fixtureId,
        match_date: f.matchDate,
        league_name: f.leagueName,
        home_team: f.homeTeam,
        away_team: f.awayTeam,
        selected_outcome: f.selectedOutcome,
        selection_odds: Number(f.selectionOdds),
        result_status: f.resultStatus,
        actual_score: f.actualScore,
        ai_probability: f.aiProbability != null ? Number(f.aiProbability) : null,
        expected_value: f.expectedValue != null ? Number(f.expectedValue) : null,
        leg_number: f.legNumber,
      })),
    };
  }
}
