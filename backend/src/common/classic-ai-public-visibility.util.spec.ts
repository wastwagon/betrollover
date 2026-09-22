import { isClassicAiHiddenFromPublic, classicAiOwnerUserIds } from './classic-ai-public-visibility.util';

describe('classic AI public visibility', () => {
  const key = 'HIDE_CLASSIC_AI_TIPSTERS_FROM_PUBLIC';
  const previous = process.env[key];

  afterEach(() => {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  });

  it('hides classic 1-fixture AI tipsters by default', () => {
    delete process.env[key];
    expect(isClassicAiHiddenFromPublic()).toBe(true);
  });

  it('shows them only when the flag is explicitly off', () => {
    process.env[key] = 'false';
    expect(isClassicAiHiddenFromPublic()).toBe(false);
    process.env[key] = 'true';
    expect(isClassicAiHiddenFromPublic()).toBe(true);
    process.env[key] = '0';
    expect(isClassicAiHiddenFromPublic()).toBe(false);
  });

  it('does not treat Acca Desk or VIP owners as classic AI for fixture locking', () => {
    expect(
      classicAiOwnerUserIds([
        { isAi: true, tipsterType: 'ai', userId: 11 },
        { isAi: true, tipsterType: 'acca_desk', userId: 22 },
        { isAi: true, tipsterType: 'vip', userId: 33 },
        { isAi: false, tipsterType: 'ai', userId: 44 },
      ]),
    ).toEqual([11]);
  });
});
