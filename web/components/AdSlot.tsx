'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getApiUrl, getAdImageUrl, TELEGRAM_ADS_URL } from '@/lib/site-config';

interface AdCampaign {
  id: number;
  advertiserName: string;
  imageUrl: string;
  targetUrl: string;
  width?: number;
  height?: number;
}

interface AdSlotProps {
  zoneSlug: string;
  className?: string;
  /** Full-width banner (728×90) layout */
  fullWidth?: boolean;
}

const TELEGRAM_ICON = (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

export function AdSlot({ zoneSlug, className = '', fullWidth = false }: AdSlotProps) {
  const [ad, setAd] = useState<AdCampaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiUrl()}/ads/zone/${zoneSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAd(data))
      .catch(() => setAd(null))
      .finally(() => setLoading(false));
  }, [zoneSlug]);

  // Record impression when ad is displayed (once per mount)
  useEffect(() => {
    if (!ad?.id) return;
    fetch(`${getApiUrl()}/ads/impression/${ad.id}`, { method: 'POST' }).catch(() => {});
  }, [ad?.id]);

  const placeholderSize = fullWidth ? { minWidth: 728, minHeight: 90 } : { minWidth: 300, minHeight: 250 };

  if (loading) {
    return (
      <div
        className={`rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg)] flex items-center justify-center ${className}`}
        style={placeholderSize}
      >
        <span className="text-sm text-[var(--text-muted)]">Loading...</span>
      </div>
    );
  }

  if (!ad) {
    return (
      <div
        className={`rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg)] flex flex-col items-center justify-center gap-2 p-4 ${className}`}
        style={placeholderSize}
      >
        <span className="text-xs text-[var(--text-muted)] font-medium">Advertise here</span>
        <a
          href={TELEGRAM_ADS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium transition-colors"
        >
          {TELEGRAM_ICON}
          <span>Contact on Telegram</span>
        </a>
        <span className="text-[10px] text-[var(--text-muted)]">Interested in advertising?</span>
      </div>
    );
  }

  const handleClick = () => {
    fetch(`${getApiUrl()}/ads/click/${ad.id}`, { method: 'POST' }).catch(() => {});
  };

  return (
    <div className={className}>
      <Link
        href={ad.targetUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className="block rounded-xl overflow-hidden border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors"
      >
        <Image
          src={getAdImageUrl(ad.imageUrl) || ad.imageUrl}
          alt={`Ad: ${ad.advertiserName}`}
          width={ad.width || 300}
          height={ad.height || 250}
          className="w-full h-auto"
          style={{ maxWidth: ad.width || 300, maxHeight: ad.height || 250, objectFit: 'contain' }}
          unoptimized
        />
      </Link>
      <span className="block text-[10px] text-[var(--text-muted)] mt-1 text-center">Ad</span>
    </div>
  );
}
