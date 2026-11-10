'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getApiUrl, getAdImageUrl } from '@/lib/site-config';

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
  /** Wide banner zone — still fluid on mobile (no fixed 728px min-width). */
  fullWidth?: boolean;
}

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

  /** Never use fixed minWidth (e.g. 728px) — it breaks mobile and causes horizontal overflow. */
  const shell = `w-full max-w-full min-w-0 box-border ${className}`;
  const placeholderMinH = fullWidth ? 'min-h-[72px] sm:min-h-[90px]' : 'min-h-[200px] sm:min-h-[250px]';

  if (loading) {
    return (
      <div
        className={`${shell} rounded-xl border-2 border-dashed border-[var(--separator)] bg-[var(--bg)] flex items-center justify-center ${placeholderMinH}`}
      >
        <span className="text-sm text-[var(--text-muted)]">Loading...</span>
      </div>
    );
  }

  if (!ad) {
    // Only render when a live campaign exists — never show empty ad placeholders.
    return null;
  }

  const handleClick = () => {
    fetch(`${getApiUrl()}/ads/click/${ad.id}`, { method: 'POST' }).catch(() => {});
  };

  const imgW = ad.width && ad.width > 0 ? ad.width : 300;
  const imgH = ad.height && ad.height > 0 ? ad.height : 250;
  const maxDisplayH = fullWidth ? 'min(120px, 40vw)' : 'min(400px, 70vh)';

  return (
    <div className={`${shell} ${placeholderMinH} flex flex-col justify-center`}>
      <Link
        href={ad.targetUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className="block w-full max-w-full rounded-xl overflow-hidden border border-[var(--separator)] hover:border-[var(--primary)]/30 transition-colors bg-[var(--card)]/40"
      >
        <div
          className="relative w-full mx-auto max-w-full"
          style={{
            aspectRatio: `${imgW} / ${imgH}`,
            maxHeight: maxDisplayH,
          }}
        >
          <Image
            src={getAdImageUrl(ad.imageUrl) || ad.imageUrl}
            alt={`Ad: ${ad.advertiserName}`}
            fill
            sizes="(max-width: 768px) 100vw, 728px"
            className="object-contain object-center"
            unoptimized
          />
        </div>
      </Link>
      <span className="block text-[10px] text-[var(--text-muted)] mt-1 text-center">Ad</span>
    </div>
  );
}
