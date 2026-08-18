export type WelcomeStepKey = 'welcome_d0' | 'welcome_d1' | 'welcome_d3';

export type WelcomeStep = {
  key: WelcomeStepKey;
  minHoursAfterConsent: number;
  requiresPrior: WelcomeStepKey | null;
  subject: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaPath: string;
};

/** Opt-in only. Informational — not betting advice. */
export const WELCOME_STEPS: WelcomeStep[] = [
  {
    key: 'welcome_d0',
    minHoursAfterConsent: 0,
    requiresPrior: null,
    subject: 'Welcome to BetRollover',
    eyebrow: 'Welcome',
    title: 'You’re in',
    body: 'Browse free and paid football slips on the marketplace. This is informational only — 18+. You choose what to follow; we don’t stake for you.',
    ctaLabel: 'Browse marketplace',
    ctaPath: '/marketplace',
  },
  {
    key: 'welcome_d1',
    minHoursAfterConsent: 24,
    requiresPrior: 'welcome_d0',
    subject: 'Build a 2-fold in Acca Generator',
    eyebrow: 'Acca Generator',
    title: 'Two legs. Your call.',
    body: 'Acca Generator ranks football markets by odd band so you can assemble a short slip. Educational tool — not a guarantee.',
    ctaLabel: 'Open Acca Generator',
    ctaPath: '/acca-generator',
  },
  {
    key: 'welcome_d3',
    minHoursAfterConsent: 72,
    requiresPrior: 'welcome_d1',
    subject: 'Follow tipsters for free shorts',
    eyebrow: 'Follow',
    title: 'Short lists, not long accas',
    body: 'Follow Acca Desk Over 1.5 / Over 2.5 tipsters for 2-fold shorts, or check Free Tip of the Day on the homepage. Pick your own legs.',
    ctaLabel: 'See tipsters',
    ctaPath: '/marketplace',
  },
];
