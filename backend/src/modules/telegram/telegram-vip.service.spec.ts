import { TelegramVipService } from './telegram-vip.service';

describe('TelegramVipService.repostHouseVipCoupon', () => {
  const ticketRepo = { findOne: jest.fn() };
  const pickRepo = { find: jest.fn() };
  const tipsterRepo = { findOne: jest.fn() };

  const service = new TelegramVipService(
    {} as never,
    {} as never,
    tipsterRepo as never,
    {} as never,
    ticketRepo as never,
    pickRepo as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_VIP_CHAT_ID;
  });

  it('returns not_configured when VIP Telegram env is missing', async () => {
    await expect(service.repostHouseVipCoupon(12)).resolves.toEqual({
      ok: false,
      error: 'not_configured',
      couponId: 12,
    });
    expect(ticketRepo.findOne).not.toHaveBeenCalled();
  });

  it('returns not_found when the coupon does not exist', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token';
    process.env.TELEGRAM_VIP_CHAT_ID = '-1001';
    ticketRepo.findOne.mockResolvedValue(null);
    await expect(service.repostHouseVipCoupon(99)).resolves.toEqual({
      ok: false,
      error: 'not_found',
      couponId: 99,
    });
  });

  it('returns not_vip_coupon when the ticket is not the house VIP tipster', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token';
    process.env.TELEGRAM_VIP_CHAT_ID = '-1001';
    ticketRepo.findOne.mockResolvedValue({ id: 5, userId: 8 });
    tipsterRepo.findOne.mockResolvedValue({ userId: 3 });
    await expect(service.repostHouseVipCoupon(5)).resolves.toEqual({
      ok: false,
      error: 'not_vip_coupon',
      couponId: 5,
    });
    expect(pickRepo.find).not.toHaveBeenCalled();
  });
});
