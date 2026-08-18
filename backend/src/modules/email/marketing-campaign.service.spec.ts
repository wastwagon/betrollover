import { MarketingCampaignService } from './marketing-campaign.service';

function stubService(): MarketingCampaignService {
  return new MarketingCampaignService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

describe('MarketingCampaignService digest keys', () => {
  it('uses the Accra calendar date in digest_free_tip_YYYY-MM-DD', () => {
    const svc = stubService();
    const noonUtc = new Date('2026-08-18T12:00:00Z');
    expect(svc.digestKeyForToday(noonUtc)).toBe('digest_free_tip_2026-08-18');
    expect(svc.accraDayStart(noonUtc).toISOString().startsWith('2026-08-18')).toBe(true);
  });
});
