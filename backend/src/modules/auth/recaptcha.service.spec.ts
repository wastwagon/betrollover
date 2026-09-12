import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecaptchaService } from './recaptcha.service';

describe('RecaptchaService', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  function make(secret: string) {
    return new RecaptchaService({
      get: jest.fn().mockReturnValue(secret),
    } as unknown as ConfigService);
  }

  it('skips verification in non-production when secret is missing', async () => {
    process.env.NODE_ENV = 'development';
    await expect(make('').verifyOrThrow(undefined)).resolves.toBeUndefined();
  });

  it('rejects in production when secret is missing', async () => {
    process.env.NODE_ENV = 'production';
    await expect(make('').verifyOrThrow('token')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects an empty token when a secret is configured', async () => {
    process.env.NODE_ENV = 'development';
    await expect(make('secret').verifyOrThrow('')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a Google success response', async () => {
    process.env.NODE_ENV = 'development';
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;
    await expect(make('secret').verifyOrThrow('ok-token')).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalled();
  });

  it('rejects a Google failure response', async () => {
    process.env.NODE_ENV = 'development';
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: false }),
    }) as unknown as typeof fetch;
    await expect(make('secret').verifyOrThrow('bad')).rejects.toBeInstanceOf(BadRequestException);
  });
});
