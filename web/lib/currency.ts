/**
 * Currency support for BetRollover.
 * Base currency is GHS (Ghana Cedi). All other currencies are for user reference only.
 * Transactions, wallets, and escrow always operate in GHS.
 */

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'GHS', symbol: '₵',   name: 'Ghana Cedi',          flag: '🇬🇭' },
  { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira',       flag: '🇳🇬' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling',      flag: '🇰🇪' },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand',   flag: '🇿🇦' },
  { code: 'USD', symbol: '$',   name: 'US Dollar',            flag: '🇺🇸' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',        flag: '🇬🇧' },
  { code: 'EUR', symbol: '€',   name: 'Euro',                 flag: '🇪🇺' },
];

/** Approximate fallback rates (GHS base) — used if API is unavailable */
export const FALLBACK_RATES: Record<string, number> = {
  GHS: 1,
  NGN: 105,
  KES: 9.2,
  ZAR: 1.0,
  USD: 0.065,
  GBP: 0.052,
  EUR: 0.060,
};

export const RATES_CACHE_KEY = 'br_exchangeRates';
export const RATES_CACHE_TIME_KEY = 'br_exchangeRatesTime';
export const RATES_CACHE_TTL = 60 * 60 * 1000; // 1 hour
export const PREFERRED_CURRENCY_KEY = 'br_preferredCurrency';

export function getCurrencyByCode(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function formatAmount(
  ghs: number,
  targetCode: string,
  rates: Record<string, number>,
  opts: { showOriginal?: boolean } = {},
): { primary: string; original?: string } {
  const currency = getCurrencyByCode(targetCode);
  const n = Number(ghs);
  const val = Number.isFinite(n) ? n : 0;

  if (targetCode === 'GHS' || !rates[targetCode]) {
    return { primary: `${currency.symbol}${val.toFixed(2)}` };
  }

  const rate = rates[targetCode];
  const converted = val * rate;

  // Format with sensible decimals
  const formatted = converted >= 100
    ? converted.toFixed(0)
    : converted >= 10
    ? converted.toFixed(1)
    : converted.toFixed(2);

  return {
    primary: `${currency.symbol}${formatted}`,
    original: opts.showOriginal ? `₵${val.toFixed(2)}` : undefined,
  };
}
