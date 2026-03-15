import { validatePasswordPolicy } from './password-policy.util';

describe('validatePasswordPolicy', () => {
  it('accepts valid passwords (letter + number, min 8 chars)', () => {
    expect(validatePasswordPolicy('password1')).toEqual({ valid: true });
    expect(validatePasswordPolicy('Abcd1234')).toEqual({ valid: true });
  });

  it('rejects too short', () => {
    const r = validatePasswordPolicy('Abc1234');
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.message).toMatch(/at least 8/);
  });

  it('rejects missing letter', () => {
    const r = validatePasswordPolicy('12345678');
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.message).toMatch(/letter/);
  });

  it('rejects missing number', () => {
    const r = validatePasswordPolicy('abcdefgh');
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.message).toMatch(/number/);
  });

  it('rejects empty or non-string', () => {
    expect(validatePasswordPolicy('').valid).toBe(false);
    expect(validatePasswordPolicy('   ').valid).toBe(false);
    expect(validatePasswordPolicy(null as any).valid).toBe(false);
  });
});
