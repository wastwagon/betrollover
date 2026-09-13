import { buildAllowedOrigins, isOriginAllowed } from './cors.config';

describe('dev CORS loopback', () => {
  const allowed = buildAllowedOrigins(false);

  it.each(['http://localhost:6002', 'http://127.0.0.1:6002', 'http://[::1]:6002'])(
    'allows %s so the VIP shop fetch is not blocked',
    (origin) => {
      expect(isOriginAllowed(origin, allowed)).toBe(true);
    },
  );

  it('rejects an unrelated origin', () => {
    expect(isOriginAllowed('http://evil.example:6002', allowed)).toBe(false);
  });
});
