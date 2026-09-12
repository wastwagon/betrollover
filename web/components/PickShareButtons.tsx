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
import { IconShare } from '@/components/ios/icons';

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

  if (dense) {
    return (
      <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/15 px-2.5 py-1.5 text-[10px] font-semibold text-[#128C7E] hover:bg-[#25D366]/25"
        >
          WhatsApp
        </a>
        <a
          href={tgHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1.5 text-[10px] font-semibold text-sky-700 hover:bg-sky-500/25"
        >
          Telegram
        </a>
        <button
          type="button"
          onClick={() => void copyMessage()}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--fill-secondary)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--primary)]"
        >
          {copied ? t('pick_detail.share_copied') : t('pick_detail.copy_share')}
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
        <a href={waHref} target="_blank" rel="noopener noreferrer" className={buttonClassName({ size: 'sm' })}>
          {t('pick_detail.share_whatsapp')}
        </a>
        <a
          href={tgHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors"
        >
          {t('pick_detail.share_telegram')}
        </a>
        <button
          type="button"
          onClick={() => void copyMessage()}
          className={buttonClassName({ size: 'sm', variant: 'secondary' })}
        >
          <span className="inline-flex items-center gap-1.5">
            <IconShare className="w-3.5 h-3.5" />
            {copied ? t('pick_detail.share_copied') : t('pick_detail.copy_share')}
          </span>
        </button>
        {canNativeShare ? (
          <button
            type="button"
            onClick={() => void nativeShare()}
            className={buttonClassName({ size: 'sm', variant: 'secondary' })}
          >
            {t('common.share')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
