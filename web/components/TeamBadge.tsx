'use client';

import { useState } from 'react';
import Image from 'next/image';

function countryCodeToFlagEmoji(code: string | null | undefined): string | null {
  if (!code || typeof code !== 'string' || !code.trim()) return null;
  const FIFA_TO_ALPHA2: Record<string, string> = {
    ENG: 'GB', SCO: 'GB', WAL: 'GB', NIR: 'GB', GBR: 'GB',
    GER: 'DE', DEU: 'DE', FRA: 'FR', ESP: 'ES', ITA: 'IT', PRT: 'PT',
    BRA: 'BR', ARG: 'AR', NED: 'NL', BEL: 'BE', URU: 'UY', SUI: 'CH',
    HRV: 'HR', DNK: 'DK', SWE: 'SE', POL: 'PL', MEX: 'MX', USA: 'US',
    GHA: 'GH', NGA: 'NG', SEN: 'SN', MAR: 'MA', EGY: 'EG', CMR: 'CM',
    CIV: 'CI', TUN: 'TN', IRL: 'IE', JPN: 'JP', KOR: 'KR', AUS: 'AU', CHN: 'CN',
  };
  const raw = code.trim().toUpperCase();
  const alpha2 = raw.length === 2 ? raw : FIFA_TO_ALPHA2[raw] ?? null;
  if (!alpha2 || alpha2.length !== 2) return null;
  const regionalA = 0x1f1e6;
  return alpha2.split('').map((c) => String.fromCodePoint(regionalA + (c.charCodeAt(0) - 65))).join('');
}

interface TeamBadgeProps {
  logo?: string | null;
  /** ISO 2-letter or FIFA 3-letter country code - shown as flag when no logo */
  countryCode?: string | null;
  name?: string;
  size?: number;
  className?: string;
}

/** Renders team badge (logo) or country flag when available. Falls back to flag if no logo. */
export function TeamBadge({ logo, countryCode, name, size = 24, className = '' }: TeamBadgeProps) {
  const [imgError, setImgError] = useState(false);
  const showLogo = logo && !imgError && logo.startsWith('http');
  const flagEmoji = countryCodeToFlagEmoji(countryCode);

  if (showLogo) {
    return (
      <Image
        src={logo}
        alt=""
        width={size}
        height={size}
        className={`object-contain flex-shrink-0 ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        onError={() => setImgError(true)}
        unoptimized
      />
    );
  }
  if (flagEmoji) {
    return (
      <span
        className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size, fontSize: Math.round(size * 0.9) }}
        title={name || ''}
        aria-hidden
      >
        {flagEmoji}
      </span>
    );
  }
  return null;
}
