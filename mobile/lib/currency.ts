/**
 * Currency support for BetRollover Mobile.
 * Mirrors the web currency system. Uses AsyncStorage for persistence.
 * Base currency: GHS. Others are for display reference only.
 */
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'GHS', symbol: '₵',   name: 'Ghana Cedi',         flag: '🇬🇭' },
  { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira',      flag: '🇳🇬' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling',     flag: '🇰🇪' },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand',  flag: '🇿🇦' },
  { code: 'USD', symbol: '$',   name: 'US Dollar',           flag: '🇺🇸' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',       flag: '🇬🇧' },
  { code: 'EUR', symbol: '€',   name: 'Euro',                flag: '🇪🇺' },
];

const FALLBACK_RATES: Record<string, number> = {
  GHS: 1, NGN: 105, KES: 9.2, ZAR: 1.0, USD: 0.065, GBP: 0.052, EUR: 0.060,
};

const CURRENCY_KEY = 'br_mobile_currency';
const RATES_KEY = 'br_mobile_rates';
const RATES_TIME_KEY = 'br_mobile_rates_time';
const CACHE_TTL = 3600000; // 1 hour

export function useCurrencyMobile() {
  const [currencyCode, setCurrencyCodeState] = useState('GHS');
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(CURRENCY_KEY);
        if (saved && CURRENCIES.some((c) => c.code === saved)) setCurrencyCodeState(saved);

        const cachedRates = await AsyncStorage.getItem(RATES_KEY);
        const cachedTime = await AsyncStorage.getItem(RATES_TIME_KEY);
        if (cachedRates && cachedTime && Date.now() - parseInt(cachedTime) < CACHE_TTL) {
          setRates(JSON.parse(cachedRates));
          return;
        }

        const res = await fetch('https://open.er-api.com/v6/latest/GHS');
        const data = await res.json();
        if (data?.rates) {
          setRates(data.rates);
          await AsyncStorage.setItem(RATES_KEY, JSON.stringify(data.rates));
          await AsyncStorage.setItem(RATES_TIME_KEY, String(Date.now()));
        }
      } catch {}
    })();
  }, []);

  const setCurrencyCode = async (code: string) => {
    setCurrencyCodeState(code);
    try { await AsyncStorage.setItem(CURRENCY_KEY, code); } catch {}
  };

  const currency = CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0];

  const format = (ghs: number): string => {
    if (currencyCode === 'GHS') return `₵${ghs.toFixed(2)}`;
    const rate = rates[currencyCode];
    if (!rate) return `₵${ghs.toFixed(2)}`;
    const converted = ghs * rate;
    const formatted = converted >= 100 ? converted.toFixed(0) : converted.toFixed(2);
    return `${currency.symbol}${formatted}`;
  };

  const formatWithOriginal = (ghs: number): { primary: string; original?: string } => {
    if (currencyCode === 'GHS') return { primary: `₵${ghs.toFixed(2)}` };
    return { primary: format(ghs), original: `₵${ghs.toFixed(2)}` };
  };

  return { currency, currencies: CURRENCIES, currencyCode, setCurrencyCode, format, formatWithOriginal, rates };
}
