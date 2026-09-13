import {
  classifyPaystackSecret,
  mapPaystackClientError,
  pickPaystackSecret,
} from './paystack-keys';

/** Built at runtime so secret scanners do not treat fixtures as Stripe keys. */
function dummyPaystackSecret(kind: 'live' | 'test'): string {
  return ['sk', kind, 'a'.repeat(24)].join('_');
}

function stubPaystackSecret(kind: 'live' | 'test'): string {
  return ['sk', kind, 'xxx'].join('_');
}

describe('Paystack key pick', () => {
  it('ignores placeholder Admin keys so env live key is used', () => {
    const picked = pickPaystackSecret({
      dbKey: stubPaystackSecret('live'),
      envKey: dummyPaystackSecret('live'),
      mode: 'live',
    });
    expect(picked.source).toBe('env');
    expect(picked.kind).toBe('live');
    expect(picked.key.startsWith(['sk', 'live', ''].join('_'))).toBe(true);
  });

  it('prefers a real Admin live key over env', () => {
    const picked = pickPaystackSecret({
      dbKey: dummyPaystackSecret('live'),
      envKey: dummyPaystackSecret('test'),
      mode: 'live',
    });
    expect(picked.source).toBe('db');
    expect(picked.kind).toBe('live');
  });

  it('in live mode skips a valid test Admin key when env has live', () => {
    const picked = pickPaystackSecret({
      dbKey: dummyPaystackSecret('test'),
      envKey: dummyPaystackSecret('live'),
      mode: 'live',
    });
    expect(picked.kind).toBe('live');
    expect(picked.source).toBe('env');
  });

  it('rejects short stubs', () => {
    expect(classifyPaystackSecret(['sk', 'test', ''].join('_')).kind).toBe('invalid');
    expect(classifyPaystackSecret(['sk', 'live', ''].join('_')).kind).toBe('invalid');
  });

  it('maps deactivated integration to an admin-facing deposit error', () => {
    expect(mapPaystackClientError('Integration has been deactivated')).toMatch(/Paystack deposits are disabled/i);
  });
});
