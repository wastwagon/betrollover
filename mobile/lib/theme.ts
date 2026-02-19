/**
 * BetRollover Mobile Design System
 * Matches web app: Emerald primary, Amber accent, trust-focused palette
 */
export const colors = {
  primary: '#10b981',
  primaryHover: '#059669',
  primaryLight: '#d1fae5',
  accent: '#f59e0b',
  accentLight: '#fef3c7',
  bg: '#ffffff',
  bgWarm: '#fafaf9',
  card: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  success: '#10b981',
  successLight: '#d1fae5',
  error: '#dc2626',
  errorLight: '#fee2e2',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const },
  titleSm: { fontSize: 24, fontWeight: '700' as const },
  heading: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodySm: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
} as const;

/** Minimum touch target (iOS HIG) */
export const TOUCH_TARGET_MIN = 44;
