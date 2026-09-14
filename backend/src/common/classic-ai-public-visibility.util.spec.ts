import { isClassicAiHiddenFromPublic } from './classic-ai-public-visibility.util';

describe('classic AI public visibility', () => {
  const key = 'HIDE_CLASSIC_AI_TIPSTERS_FROM_PUBLIC';
  const previous = process.env[key];

  afterEach(() => {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  });

  it('shows classic 1-fixture AI tipsters when the hide flag is unset', () => {
    delete process.env[key];
    expect(isClassicAiHiddenFromPublic()).toBe(false);
  });

  it('hides them only when the flag is explicitly on', () => {
    process.env[key] = 'true';
    expect(isClassicAiHiddenFromPublic()).toBe(true);
    process.env[key] = 'false';
    expect(isClassicAiHiddenFromPublic()).toBe(false);
  });
});
