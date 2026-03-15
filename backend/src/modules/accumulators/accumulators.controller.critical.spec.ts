import { Test, TestingModule } from '@nestjs/testing';
import { AccumulatorsController } from './accumulators.controller';
import { AccumulatorsService } from './accumulators.service';

describe('AccumulatorsController (critical paths)', () => {
  let controller: AccumulatorsController;
  let getMarketplacePublicList: jest.Mock;

  beforeEach(async () => {
    getMarketplacePublicList = jest.fn().mockResolvedValue({ items: [], total: 0, hasMore: false });
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccumulatorsController],
      providers: [
        {
          provide: AccumulatorsService,
          useValue: { getMarketplacePublicList },
        },
      ],
    }).compile();

    controller = module.get<AccumulatorsController>(AccumulatorsController);
  });

  describe('GET marketplace/public (guest access)', () => {
    it('returns items, total, and hasMore', async () => {
      const result = await controller.getMarketplacePublic();
      expect(result).toEqual({ items: [], total: 0, hasMore: false });
      expect(getMarketplacePublicList).toHaveBeenCalled();
    });

    it('passes query params to service', async () => {
      await controller.getMarketplacePublic('football', '12', '0', 'false');
      expect(getMarketplacePublicList).toHaveBeenCalledWith(
        expect.objectContaining({ sport: 'football', limit: 12, offset: 0, freeOnly: false }),
      );
    });
  });
});
