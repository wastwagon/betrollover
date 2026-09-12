'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage, useT } from '@/context/LanguageContext';
import { bookmakerLabelForKey } from '@betrollover/shared-types';
import { SITE_URL } from '@/lib/site-config';
import {
  buildPickShareMessage,
  pickShareUrl,
  telegramShareHref,
  whatsappShareHref,
} from '@/lib/pick-share';
import { buttonClassName } from '@/components/ui/Button';
import { IconCopy, IconShare, IconTelegram, IconWhatsApp } from '@/components/ios/icons';

export function PickShareButtons({
  couponId,
  title,
  tipsterName,
  totalOdds,
  isFree,
  bookmakerKey,
  bookingCode,
  dense = false,
}: {
  couponId: number;
  title: string;
  tipsterName?: string | null;
  totalOdds: number;
  isFree: boolean;
  /** Tipster bookmaker + code — only passed when visible on the coupon. */
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  dense?: boolean;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const { message, waHref, tgHref } = useMemo(() => {
    const path = `/coupons/${couponId}`;
    const absolute =
      typeof window !== 'undefined'
        ? `${window.location.origin}${path}`
        : `${SITE_URL.replace(/\/$/, '')}${path}`;
    const sharePath = pickShareUrl(absolute, 'whatsapp');
    const code = bookingCode?.trim() || null;
    const bookie =
      code && bookmakerKey?.trim()
        ? bookmakerLabelForKey(bookmakerKey) || bookmakerKey
        : null;
    const text = buildPickShareMessage({
      title,
      tipsterName,
      totalOdds,
      pickUrl: sharePath,
      bookmakerLabel: bookie,
      bookingCode: code,
      isFree,
      locale: lang === 'fr' ? 'fr' : 'en',
    });
    const tgUrl = pickShareUrl(absolute, 'telegram');
    return {
      message: text,
      waHref: whatsappShareHref(text),
      tgHref: telegramShareHref(text, tgUrl),
    };
  }, [couponId, title, tipsterName, totalOdds, isFree, bookmakerKey, bookingCode, lang]);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const nativeShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) {
      await copyMessage();
      return;
    }
    try {
      await navigator.share({ text: message });
    } catch {
      /* user cancelled */
    }
  };

  const waLabel = t('pick_detail.share_whatsapp');
  const tgLabel = t('pick_detail.share_telegram');
  const copyLabel = copied ? t('pick_detail.share_copied') : t('pick_detail.copy_share');

  if (dense) {
    return (
      <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          title={waLabel}
          aria-label={waLabel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366]/25 transition-colors"
        >
          <IconWhatsApp className="w-4 h-4" />
        </a>
        <a
          href={tgHref}
          target="_blank"
          rel="noopener noreferrer"
          title={tgLabel}
          aria-label={tgLabel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-700 hover:bg-sky-500/25 transition-colors"
        >
          <IconTelegram className="w-4 h-4" />
        </a>
        <button
          type="button"
          onClick={() => void copyMessage()}
          title={copyLabel}
          aria-label={copyLabel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--fill-secondary)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
        >
          <IconCopy className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        {t('pick_detail.share_pick')}
      </p>
      <p className="text-xs text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap break-words rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
        {message}
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          title={waLabel}
          aria-label={waLabel}
          className={`${buttonClassName({ size: 'sm' })} inline-flex items-center gap-1.5 !bg-[#25D366] hover:!bg-[#1da851] !text-white`}
        >
          <IconWhatsApp className="w-4 h-4" />
          {waLabel}
        </a>
        <a
          href={tgHref}
          target="_blank"
          rel="noopener noreferrer"
          title={tgLabel}
          aria-label={tgLabel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors"
        >
          <IconTelegram className="w-4 h-4" />
          {tgLabel}
        </a>
        <button
          type="button"
          onClick={() => void copyMessage()}
          title={copyLabel}
          aria-label={copyLabel}
          className={buttonClassName({ size: 'sm', variant: 'secondary' })}
        >
          <span className="inline-flex items-center gap-1.5">
            <IconCopy className="w-3.5 h-3.5" />
            {copyLabel}
          </span>
        </button>
        {canNativeShare ? (
          <button
            type="button"
            onClick={() => void nativeShare()}
            title={t('common.share')}
            aria-label={t('common.share')}
            className={buttonClassName({ size: 'sm', variant: 'secondary' })}
          >
            <span className="inline-flex items-center gap-1.5">
              <IconShare className="w-3.5 h-3.5" />
              {t('common.share')}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
