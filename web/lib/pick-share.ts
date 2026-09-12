import { withUtm } from '@/lib/utm';

export type PickShareLocale = 'en' | 'fr';

export type BuildPickShareMessageInput = {
  title: string;
  tipsterName?: string | null;
  totalOdds: number;
  pickUrl: string;
  /** Only when tipster added a bookmaker + code and the viewer can see it. */
  bookmakerLabel?: string | null;
  bookingCode?: string | null;
  isFree: boolean;
  locale?: PickShareLocale;
};

/** Share copy for a pick — leads with the tip, not brand invite fluff. */
export function buildPickShareMessage(input: BuildPickShareMessageInput): string {
  const locale = input.locale === 'fr' ? 'fr' : 'en';
  const title = (input.title || '').trim() || (locale === 'fr' ? 'Pronostic' : 'Pick');
  const odds = Number.isFinite(input.totalOdds) ? Number(input.totalOdds).toFixed(2) : '';
  const tipster = (input.tipsterName || '').trim();
  const code = (input.bookingCode || '').trim();
  const bookie = (input.bookmakerLabel || '').trim();
  const url = input.pickUrl.trim();

  const head =
    locale === 'fr'
      ? input.isFree
        ? `${title} · gratuit${odds ? ` · cote ${odds}` : ''}`
        : `${title}${odds ? ` · cote ${odds}` : ''}`
      : input.isFree
        ? `${title} · free${odds ? ` · ${odds} odds` : ''}`
        : `${title}${odds ? ` · ${odds} odds` : ''}`;

  const lines = [head];
  if (tipster) {
    lines.push(`Tipster: ${tipster}`);
  }
  // Only include when tipster actually added a code (never a placeholder).
  if (code) {
    lines.push(
      locale === 'fr'
        ? bookie
          ? `Code ${bookie}: ${code}`
          : `Code bookmaker: ${code}`
        : bookie
          ? `${bookie} code: ${code}`
          : `Booking code: ${code}`,
    );
  }
  if (url) {
    lines.push('');
    lines.push(url);
  }
  return lines.join('\n');
}

export function pickShareUrl(
  absolutePickUrl: string,
  channel: 'whatsapp' | 'telegram' | 'copy',
): string {
  return withUtm(absolutePickUrl, {
    source: channel,
    medium: 'social',
    campaign: 'pick_share',
  });
}

export function whatsappShareHref(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function telegramShareHref(message: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`;
}
