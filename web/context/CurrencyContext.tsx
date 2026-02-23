'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  CURRENCIES, Currency, getCurrencyByCode, formatAmount,
  FALLBACK_RATES, RATES_CACHE_KEY, RATES_CACHE_TIME_KEY,
  RATES_CACHE_TTL, PREFERRED_CURRENCY_KEY,
} from '@/lib/currency';

interface CurrencyContextValue {
  /** Currently selected currency */
  currency: Currency;
  /** All supported currencies */
  currencies: Currency[];
  /** Change user's preferred currency */
  setCurrencyCode: (code: string) => void;
  /** Live exchange rates (GHS base) */
  rates: Record<string, number>;
  /** Format a GHS amount in the selected currency */
  format: (ghs: number, opts?: { showOriginal?: boolean }) => { primary: string; original?: string };
  /** True while fetching rates for the first time */
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: CURRENCIES[0],
  currencies: CURRENCIES,
  setCurrencyCode: () => {},
  rates: FALLBACK_RATES,
  format: (ghs) => ({ primary: `₵${ghs.toFixed(2)}` }),
  loading: false,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCodeState] = useState('GHS');
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);

  // Hydrate preference + cached rates from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFERRED_CURRENCY_KEY);
      if (saved && CURRENCIES.some((c) => c.code === saved)) {
        setCurrencyCodeState(saved);
      }

      const cachedRates = localStorage.getItem(RATES_CACHE_KEY);
      const cachedTime = localStorage.getItem(RATES_CACHE_TIME_KEY);

      if (cachedRates && cachedTime && Date.now() - parseInt(cachedTime) < RATES_CACHE_TTL) {
        setRates(JSON.parse(cachedRates));
        setLoading(false);
        return;
      }
    } catch {}

    // Fetch fresh rates
    fetch('https://open.er-api.com/v6/latest/GHS')
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates) {
          setRates(data.rates);
          try {
            localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(data.rates));
            localStorage.setItem(RATES_CACHE_TIME_KEY, String(Date.now()));
          } catch {}
        }
      })
      .catch(() => {
        // Keep fallback rates — no action needed
      })
      .finally(() => setLoading(false));
  }, []);

  const setCurrencyCode = useCallback((code: string) => {
    setCurrencyCodeState(code);
    try { localStorage.setItem(PREFERRED_CURRENCY_KEY, code); } catch {}
  }, []);

  const format = useCallback(
    (ghs: number, opts?: { showOriginal?: boolean }) => formatAmount(ghs, currencyCode, rates, opts),
    [currencyCode, rates],
  );

  const value: CurrencyContextValue = {
    currency: getCurrencyByCode(currencyCode),
    currencies: CURRENCIES,
    setCurrencyCode,
    rates,
    format,
    loading,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
