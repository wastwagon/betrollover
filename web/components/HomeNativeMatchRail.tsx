'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { formatLiveFixturePeriod } from '@/lib/live-fixture-display';
import {
  countPicksForMatch,
  isFixtureLive,
  parseHeadlineMatchesPayload,
  type TodayMatchRow,
} from '@/lib/home-today-matches';

const REFRESH_MS = 60_000;

function formatKickoff(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function TeamLogo({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--fill-secondary)] text-sm font-semibold text-[var(--text-muted)]"
        aria-hidden
      >
        {alt.slice(0, 1)}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-xl bg-[var(--fill-secondary)] object-contain p-1"
      unoptimized
    />
  );
}

export function HomeNativeMatchRail({
  initialMatches = [],
  marketplaceItems = [],
}: {
  initialMatches?: TodayMatchRow[];
  marketplaceItems?: Record<string, unknown>[];
}) {
  const t = useT();
  const [matches, setMatches] = useState<TodayMatchRow[]>(initialMatches);

  useEffect(() => {
    const load = () => {
      fetch(`${getApiUrl()}/fixtures/platform/headline-matches?limit=8`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setMatches(parseHeadlineMatchesPayload(data));
        })
        .catch(() => {});
    };

    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const pickCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of matches) map.set(m.id, countPicksForMatch(m, marketplaceItems));
    return map;
  }, [matches, marketplaceItems]);

  if (matches.length === 0) {
    return (
      <div className="ios-grouped-section mx-0 p-4">
        <p className="text-sm text-[var(--text-muted)]">{t('home.today_matches_sub')}</p>
        <Link
          href="/live-scores"
          className="mt-3 inline-flex min-h-[44px] items-center rounded-xl px-1 text-sm font-semibold text-[var(--primary)]"
        >
          {t('home.today_matches_see_all')} →
        </Link>
      </div>
    );
  }

  return (
    <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1 scrollbar-hide snap-x snap-mandatory touch-pan-x [-webkit-overflow-scrolling:touch]">
      <div className="flex gap-3">
        {matches.map((m) => {
          const live = isFixtureLive(m.status);
          const picks = pickCounts.get(m.id) ?? 0;

          return (
            <article
              key={m.id}
              className="w-[min(84vw,340px)] shrink-0 snap-start rounded-[1.25rem] border border-[var(--separator)] bg-[var(--card)] shadow-sm overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[var(--separator)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    {m.leagueName ?? '—'}
                  </p>
                  {live ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
                      {formatLiveFixturePeriod(m.status, m.statusElapsed) || 'Live'}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[11px] font-medium text-[var(--text-muted)] tabular-nums">
                      {formatKickoff(m.matchDate)}
                    </span>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-3 min-w-0">
                  <TeamLogo src={m.homeTeamLogo} alt={m.homeTeamName} />
                  <span className="flex-1 truncate text-[15px] font-semibold text-[var(--text)]">
                    {m.homeTeamName}
                  </span>
                  {live ? (
                    <span className="text-lg font-bold tabular-nums text-[var(--text)]">{m.homeScore ?? 0}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <TeamLogo src={m.awayTeamLogo} alt={m.awayTeamName} />
                  <span className="flex-1 truncate text-[15px] font-semibold text-[var(--text)]">
                    {m.awayTeamName}
                  </span>
                  {live ? (
                    <span className="text-lg font-bold tabular-nums text-[var(--text)]">{m.awayScore ?? 0}</span>
                  ) : null}
                </div>
              </div>

              {m.spotlightPlayer ? (
                <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-[var(--fill-secondary)] px-3 py-2">
                  {m.spotlightPlayer.playerPhoto ? (
                    <Image
                      src={m.spotlightPlayer.playerPhoto}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--card)] text-xs font-bold text-[var(--text-muted)]">
                      {m.spotlightPlayer.playerName.slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      {t('home.today_matches_player_watch')}
                    </p>
                    <p className="truncate text-xs font-semibold text-[var(--text)]">
                      {m.spotlightPlayer.playerName}
                      {m.spotlightPlayer.goals != null && m.spotlightPlayer.goals > 0 ? (
                        <span className="font-normal text-[var(--text-muted)]">
                          {' '}
                          · {t('home.today_matches_player_goals', { count: String(m.spotlightPlayer.goals) })}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex border-t border-[var(--separator)]">
                <Link
                  href={`/matches/${m.id}`}
                  className="flex min-h-[44px] flex-1 items-center justify-center border-r border-[var(--separator)] text-sm font-semibold text-[var(--primary)] active:bg-[var(--fill-secondary)]"
                >
                  {t('home.today_matches_details')}
                </Link>
                <Link
                  href="/marketplace?sport=football"
                  className="flex min-h-[44px] flex-1 items-center justify-center text-sm font-semibold text-[var(--primary)] active:bg-[var(--fill-secondary)]"
                >
                  {picks > 0 ? t('home.today_matches_picks', { count: String(picks) }) : t('home.today_matches_browse')}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
