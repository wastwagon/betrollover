'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/site-config';

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
}

export function AdSlot({ zoneSlug, className = '' }: AdSlotProps) {
  const [ad, setAd] = useState<AdCampaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiUrl()}/ads/zone/${zoneSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAd(data))
      .catch(() => setAd(null))
      .finally(() => setLoading(false));
  }, [zoneSlug]);

  if (loading) {
    return (
      <div
        className={`rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg)] flex items-center justify-center min-h-[120px] ${className}`}
        style={{ minWidth: 300, minHeight: 250 }}
      >
        <span className="text-sm text-[var(--text-muted)]">Loading...</span>
      </div>
    );
  }

  if (!ad) {
    return (
      <div
        className={`rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg)] flex flex-col items-center justify-center gap-2 p-4 ${className}`}
        style={{ minWidth: 300, minHeight: 250 }}
      >
        <span className="text-xs text-[var(--text-muted)] font-medium">Advertise here</span>
        <span className="text-xs text-[var(--text-muted)]">Contact ads@betrollover.com</span>
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
        <img
          src={ad.imageUrl}
          alt={`Ad: ${ad.advertiserName}`}
          className="w-full h-auto"
          style={{ maxWidth: ad.width || 300, maxHeight: ad.height || 250, objectFit: 'contain' }}
        />
      </Link>
      <span className="block text-[10px] text-[var(--text-muted)] mt-1 text-center">Ad</span>
    </div>
  );
}
