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

    const predictionIds = predictions.map((p) => p.id);
    const fixtures = predictionIds.length
      ? await this.predictionFixtureRepo.find({
          where: predictionIds.map((id) => ({ predictionId: id })),
          order: { predictionId: 'ASC', legNumber: 'ASC' },
        })
      : [];
    const fixturesByPredictionId = new Map<number, PredictionFixture[]>();
    for (const f of fixtures) {
      const list = fixturesByPredictionId.get(f.predictionId) ?? [];
      list.push(f);
      fixturesByPredictionId.set(f.predictionId, list);
    }

    // Compatibility payload: return camelCase (preferred) plus legacy snake_case keys.
    const enriched = predictions.map((p) => {
      const pf = fixturesByPredictionId.get(p.id) ?? [];
      return {
        id: p.id,
        predictionTitle: p.predictionTitle,
        prediction_title: p.predictionTitle,
        combinedOdds: Number(p.combinedOdds),
        combined_odds: Number(p.combinedOdds),
        stakeUnits: Number(p.stakeUnits),
        stake_units: Number(p.stakeUnits),
        confidenceLevel: p.confidenceLevel,
        confidence_level: p.confidenceLevel,
        status: p.status,
        predictionDate: p.predictionDate,
        prediction_date: p.predictionDate,
        postedAt: p.postedAt,
        posted_at: p.postedAt,
        username: (p.tipster as Tipster).username,
        displayName: (p.tipster as Tipster).displayName,
        display_name: (p.tipster as Tipster).displayName,
        avatarUrl: (p.tipster as Tipster).avatarUrl,
        avatar_url: (p.tipster as Tipster).avatarUrl,
        roi: Number((p.tipster as Tipster).roi),
        winRate: Number((p.tipster as Tipster).winRate),
        win_rate: Number((p.tipster as Tipster).winRate),
        fixtures: pf.map((f) => ({
          id: f.id,
          fixtureId: f.fixtureId,
          fixture_id: f.fixtureId,
          matchDate: f.matchDate,
          match_date: f.matchDate,
          leagueName: f.leagueName,
          league_name: f.leagueName,
          homeTeam: f.homeTeam,
          home_team: f.homeTeam,
          awayTeam: f.awayTeam,
          away_team: f.awayTeam,
          selectedOutcome: f.selectedOutcome,
          selected_outcome: f.selectedOutcome,
          selectionOdds: Number(f.selectionOdds),
          selection_odds: Number(f.selectionOdds),
          resultStatus: f.resultStatus,
          result_status: f.resultStatus,
          legNumber: f.legNumber,
          leg_number: f.legNumber,
        })),
      };
    });

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

    // Compatibility payload: return camelCase (preferred) plus legacy snake_case keys.
    return {
      prediction: {
        id: prediction.id,
        tipsterId: prediction.tipsterId,
        tipster_id: prediction.tipsterId,
        predictionTitle: prediction.predictionTitle,
        prediction_title: prediction.predictionTitle,
        combinedOdds: Number(prediction.combinedOdds),
        combined_odds: Number(prediction.combinedOdds),
        stakeUnits: Number(prediction.stakeUnits),
        stake_units: Number(prediction.stakeUnits),
        confidenceLevel: prediction.confidenceLevel,
        confidence_level: prediction.confidenceLevel,
        status: prediction.status,
        predictionDate: prediction.predictionDate,
        prediction_date: prediction.predictionDate,
        postedAt: prediction.postedAt,
        posted_at: prediction.postedAt,
        settledAt: prediction.settledAt,
        settled_at: prediction.settledAt,
        actualResult: prediction.actualResult != null ? Number(prediction.actualResult) : null,
        actual_result: prediction.actualResult != null ? Number(prediction.actualResult) : null,
        username: (prediction.tipster as Tipster).username,
        displayName: (prediction.tipster as Tipster).displayName,
        display_name: (prediction.tipster as Tipster).displayName,
        avatarUrl: (prediction.tipster as Tipster).avatarUrl,
        avatar_url: (prediction.tipster as Tipster).avatarUrl,
      },
      fixtures: fixtures.map((f) => ({
        id: f.id,
        fixtureId: f.fixtureId,
        fixture_id: f.fixtureId,
        matchDate: f.matchDate,
        match_date: f.matchDate,
        leagueName: f.leagueName,
        league_name: f.leagueName,
        homeTeam: f.homeTeam,
        home_team: f.homeTeam,
        awayTeam: f.awayTeam,
        away_team: f.awayTeam,
        selectedOutcome: f.selectedOutcome,
        selected_outcome: f.selectedOutcome,
        selectionOdds: Number(f.selectionOdds),
        selection_odds: Number(f.selectionOdds),
        resultStatus: f.resultStatus,
        result_status: f.resultStatus,
        actualScore: f.actualScore,
        actual_score: f.actualScore,
        aiProbability: f.aiProbability != null ? Number(f.aiProbability) : null,
        ai_probability: f.aiProbability != null ? Number(f.aiProbability) : null,
        expectedValue: f.expectedValue != null ? Number(f.expectedValue) : null,
        expected_value: f.expectedValue != null ? Number(f.expectedValue) : null,
        legNumber: f.legNumber,
        leg_number: f.legNumber,
      })),
    };
  }
}
