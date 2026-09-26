import { telegramMonthlyCron } from './telegram-growth.scheduler';

describe('telegramMonthlyCron', () => {
  it('keeps an already-monthly cron', () => {
    expect(telegramMonthlyCron('0 17 1 * *', '0 17 1 * *')).toBe('0 17 1 * *');
  });

  it('coerces leftover daily Coolify crons to day 1', () => {
    expect(telegramMonthlyCron('0 17 * * *', '0 17 1 * *')).toBe('0 17 1 * *');
    expect(telegramMonthlyCron('0 8 * * *', '0 8 1 * *')).toBe('0 8 1 * *');
    expect(telegramMonthlyCron('0 12 * * *', '0 12 1 * *')).toBe('0 12 1 * *');
  });

  it('falls back when env is empty', () => {
    expect(telegramMonthlyCron(undefined, '0 17 1 * *')).toBe('0 17 1 * *');
    expect(telegramMonthlyCron('  ', '0 8 1 * *')).toBe('0 8 1 * *');
  });
});
