import { isAccraMonday, recapCampaignKey, recapWindow } from './recap-campaigns.config';

describe('weekly recap window', () => {
  const tz = 'Africa/Accra';

  it('is Monday-only in Accra', () => {
    expect(isAccraMonday(new Date('2026-08-17T09:00:00Z'), tz)).toBe(true);
    expect(isAccraMonday(new Date('2026-08-18T09:00:00Z'), tz)).toBe(false);
    expect(isAccraMonday(new Date('2026-08-16T09:00:00Z'), tz)).toBe(false);
  });

  it('keys the week by Monday date and looks back 7 days', () => {
    const monday = new Date(Date.UTC(2026, 7, 17));
    expect(recapCampaignKey(monday)).toBe('recap_week_2026-08-17');
    const { from, to } = recapWindow(monday);
    expect(from.toISOString()).toBe('2026-08-10T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-08-17T00:00:00.000Z');
  });
});
