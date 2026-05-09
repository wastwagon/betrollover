'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/context/LanguageContext';
import { bookmakerLabelForKey } from '@betrollover/shared-types';
import { getApiUrl } from '@/lib/site-config';

export function BookingCodeCopyBlock({
  couponId,
  bookmakerKey,
  bookingCode,
  dense,
  initialCopyCount = 0,
  hideFooterHint = false,
}: {
  couponId: number;
  bookmakerKey: string;
  bookingCode: string;
  dense?: boolean;
  initialCopyCount?: number;
  /** When true, omit the default “paste in app” line (e.g. detail page uses its own note). */
  hideFooterHint?: boolean;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [copyCount, setCopyCount] = useState(initialCopyCount);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tipsterNames, setTipsterNames] = useState<string[] | null>(null);
  const [tooltipLoading, setTooltipLoading] = useState(false);

  useEffect(() => {
    setCopyCount(initialCopyCount);
  }, [initialCopyCount]);

  const loadCopiers = () => {
    if (tipsterNames !== null) return;
    setTooltipLoading(true);
    void (async () => {
      try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const r = await fetch(`${getApiUrl()}/accumulators/${couponId}/booking-code-copies`, { headers });
        if (!r.ok) {
          setTipsterNames([]);
          return;
        }
        const d = (await r.json()) as { tipsterNames?: string[] };
        setTipsterNames(Array.isArray(d.tipsterNames) ? d.tipsterNames : []);
      } catch {
        setTipsterNames([]);
      } finally {
        setTooltipLoading(false);
      }
    })();
  };

  const handleCopy = () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(bookingCode);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
          const res = await fetch(`${getApiUrl()}/accumulators/${couponId}/booking-code-copy`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const body = (await res.json()) as { count?: number };
            if (typeof body.count === 'number') setCopyCount(body.count);
          }
        }
      } catch {
        /* clipboard or network */
      }
    })();
  };

  const label = bookmakerLabelForKey(bookmakerKey) || bookmakerKey;

  return (
    <div
      className={
        dense
          ? 'rounded-lg border border-[var(--border)] bg-[var(--bg)]/50 p-2.5 mb-2'
          : 'rounded-xl border border-[var(--border)] bg-[var(--bg)]/50 p-3 mb-4'
      }
    >
      <div className="flex items-start justify-between gap-2 min-w-0 mb-1.5">
        <p className={`font-medium text-[var(--text)] min-w-0 ${dense ? 'text-[10px]' : 'text-xs'}`}>
          {t('pick_card.booking_code_title', { bookie: label })}
        </p>
        <div className={`flex items-center gap-2 shrink-0 ${dense ? 'flex-wrap justify-end' : ''}`}>
          <div
            className="relative"
            onMouseEnter={() => {
              setTooltipVisible(true);
              loadCopiers();
            }}
            onMouseLeave={() => setTooltipVisible(false)}
          >
            <span
              className={`tabular-nums text-[var(--text-muted)] cursor-default border-b border-dotted border-[var(--text-muted)]/50 ${
                dense ? 'text-[10px]' : 'text-xs'
              }`}
            >
              {t('pick_card.booking_copy_count', { n: String(copyCount) })}
            </span>
            {tooltipVisible ? (
              <div
                className={`absolute right-0 bottom-full z-50 mb-1 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg ${
                  dense ? 'min-w-[180px] max-w-[220px] p-2 text-[10px]' : 'min-w-[200px] max-w-[260px] p-2.5 text-xs'
                }`}
                role="tooltip"
              >
                <p className="font-semibold text-[var(--text)] mb-1">{t('pick_card.booking_copy_tipsters_title')}</p>
                {tooltipLoading && tipsterNames === null ? (
                  <p className="text-[var(--text-muted)]">{t('common.loading')}</p>
                ) : !tipsterNames || tipsterNames.length === 0 ? (
                  <p className="text-[var(--text-muted)] leading-snug">{t('pick_card.booking_copy_no_tipsters')}</p>
                ) : (
                  <ul className="max-h-36 overflow-y-auto space-y-0.5 text-[var(--text)]">
                    {tipsterNames.map((n) => (
                      <li key={n} className="truncate" title={n}>
                        {n}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`shrink-0 font-semibold rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors ${
              dense ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
            }`}
          >
            {copied ? t('pick_card.booking_code_copied') : t('pick_card.copy_booking_code')}
          </button>
        </div>
      </div>
      <p
        className={`font-mono break-all text-[var(--text)] bg-[var(--card)] border border-[var(--border)] rounded-md px-2 py-1 ${
          dense ? 'text-[10px]' : 'text-xs'
        }`}
      >
        {bookingCode}
      </p>
      {!hideFooterHint ? (
        <p className={`text-[var(--text-muted)] mt-1.5 ${dense ? 'text-[9px]' : 'text-[10px]'}`}>
          {t('pick_card.booking_code_hint')}
        </p>
      ) : null}
    </div>
  );
}
