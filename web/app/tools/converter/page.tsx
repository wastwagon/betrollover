'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCurrency } from '@/context/CurrencyContext';
import { CURRENCIES } from '@/lib/currency';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { useT } from '@/context/LanguageContext';

export default function ConverterPage() {
  const t = useT();
  const { rates } = useCurrency();
  const [amount, setAmount] = useState('25');

  const ghs = parseFloat(amount) || 0;

  const rows = CURRENCIES.filter((c) => c.code !== 'GHS').map((c) => {
    const rate = rates[c.code] ?? 0;
    const converted = ghs * rate;
    return { ...c, rate, converted };
  });

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />

      <main className="section-ux-page flex-1 w-full min-w-0">
        <PageHeader
          label={t('tools.badge')}
          title={t('tools.converter_title')}
          tagline={t('tools.converter_tagline')}
        />

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 mb-6">
          <Link
            href="/"
            className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full sm:w-auto"
          >
            {t('nav.home')}
          </Link>
          <Link
            href="/wallet"
            className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full sm:w-auto"
          >
            {t('nav.wallet')}
          </Link>
        </div>

        <div className="mb-6">
          <AdSlot zoneSlug="tools-converter-full" fullWidth className="w-full max-w-3xl" />
        </div>

        {/* Input */}
        <div className="card-gradient rounded-2xl p-6 mb-6 shadow-sm">
          <label className="block text-sm font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
            Amount in GHS (₵)
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
            <span className="text-3xl font-bold text-[var(--primary)] flex-shrink-0">₵</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 min-w-0 text-2xl sm:text-3xl font-bold bg-transparent outline-none text-[var(--text)] border-b-2 border-[var(--primary)] pb-1"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-2">
          {rows.map((c) => (
            <div
              key={c.code}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 card-gradient rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-colors min-w-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{c.flag}</span>
                <div>
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    1 GHS ≈ {c.rate > 0 ? c.rate.toFixed(4) : '—'} {c.code}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[var(--primary)]">
                  {c.rate > 0 && ghs > 0
                    ? `${c.symbol}${c.converted >= 100 ? c.converted.toFixed(0) : c.converted.toFixed(2)}`
                    : `${c.symbol}—`}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{c.code}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <p className="font-semibold mb-1">Reference Only</p>
          <p>
            Exchange rates are sourced from{' '}
            <a href="https://open.er-api.com" target="_blank" rel="noopener noreferrer" className="underline">open.er-api.com</a>
            {' '}and cached hourly. All payments and withdrawals on BetRollover are processed in Ghana Cedi (GHS).
          </p>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
