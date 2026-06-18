'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/80"
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
      className="h-9 w-9 shrink-0 rounded-full bg-white/10 object-contain p-0.5"
      unoptimized
    />
  );
}

export function HomeTodayMatches({
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
      fetch(`${getApiUrl()}/fixtures/platform/headline-matches?limit=8`, {
        cache: 'no-store',
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          setMatches(parseHeadlineMatchesPayload(data));
        })
        .catch(() => {});
    };

    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const pickCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of matches) {
      map.set(m.id, countPicksForMatch(m, marketplaceItems));
    }
    return map;
  }, [matches, marketplaceItems]);

  if (matches.length === 0) return null;

  return (
    <div className="relative max-w-7xl mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 pb-10 sm:pb-12 md:pb-14">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
            {t('home.today_matches_title')}
          </h2>
          <p className="text-xs text-slate-300/90 mt-0.5">{t('home.today_matches_sub')}</p>
        </div>
        <Link
          href="/live-scores"
          className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 whitespace-nowrap shrink-0"
        >
          {t('home.today_matches_see_all')} →
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x snap-x snap-mandatory [-webkit-overflow-scrolling:touch]">
        {matches.map((m) => {
          const live = isFixtureLive(m.status);
          const picks = pickCounts.get(m.id) ?? 0;
          return (
            <article
              key={m.id}
              className="snap-start shrink-0 w-[min(82vw,280px)] sm:w-[260px] rounded-2xl border border-white/15 bg-black/35 backdrop-blur-md p-4 shadow-lg"
            >
              <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-300 truncate">
                  {m.leagueName ?? '—'}
                </p>
                {live ? (
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-500/25 border border-red-400/40 px-2 py-0.5 text-[10px] font-bold text-red-200 tabular-nums">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" aria-hidden />
                    {formatLiveFixturePeriod(m.status, m.statusElapsed) || 'LIVE'}
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-semibold text-slate-300 tabular-nums">
                    {formatKickoff(m.matchDate)}
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <TeamLogo src={m.homeTeamLogo} alt={m.homeTeamName} />
                  <span className="text-sm font-semibold text-white truncate flex-1">{m.homeTeamName}</span>
                  {live && (
                    <span className="text-base font-bold text-white tabular-nums shrink-0">
                      {m.homeScore ?? 0}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <TeamLogo src={m.awayTeamLogo} alt={m.awayTeamName} />
                  <span className="text-sm font-semibold text-white truncate flex-1">{m.awayTeamName}</span>
                  {live && (
                    <span className="text-base font-bold text-white tabular-nums shrink-0">
                      {m.awayScore ?? 0}
                    </span>
                  )}
                </div>
              </div>

              {m.spotlightPlayer && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 min-w-0">
                  {m.spotlightPlayer.playerPhoto ? (
                    <Image
                      src={m.spotlightPlayer.playerPhoto}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 shrink-0 rounded-full object-cover bg-white/10"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/80">
                      {m.spotlightPlayer.playerName.slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                      {t('home.today_matches_player_watch')}
                    </p>
                    <p className="text-xs font-semibold text-white truncate">
                      {m.spotlightPlayer.playerName}
                      {m.spotlightPlayer.goals != null && m.spotlightPlayer.goals > 0 && (
                        <span className="text-slate-300 font-normal">
                          {' '}
                          · {t('home.today_matches_player_goals', {
                            count: String(m.spotlightPlayer.goals),
                          })}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-2">
                <Link
                  href="/marketplace?sport=football"
                  className="inline-flex items-center justify-center min-h-[36px] px-3 rounded-lg bg-emerald-500/90 hover:bg-emerald-400 text-white text-xs font-semibold transition-colors"
                >
                  {picks > 0
                    ? t('home.today_matches_picks', { count: String(picks) })
                    : t('home.today_matches_browse')}
                </Link>
                <Link
                  href={`/matches/${m.id}`}
                  className="text-[11px] font-medium text-slate-300 hover:text-white"
                >
                  {t('home.today_matches_details')}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
