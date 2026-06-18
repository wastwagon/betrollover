'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const AUTO_ADVANCE_MS = 6_000;
const SWIPE_THRESHOLD_PX = 48;

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

function TeamLogo({ src, alt, size = 'lg' }: { src: string | null; alt: string; size?: 'lg' | 'md' }) {
  const dim = size === 'lg' ? 'h-16 w-16 md:h-20 md:w-20' : 'h-12 w-12';
  const text = size === 'lg' ? 'text-lg' : 'text-sm';
  if (!src) {
    return (
      <span
        className={`flex ${dim} shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-2 ring-white/20 text-white/90 font-bold ${text} shadow-lg`}
        aria-hidden
      >
        {alt.slice(0, 1)}
      </span>
    );
  }
  return (
    <div className={`relative ${dim} shrink-0 rounded-2xl bg-white/10 ring-2 ring-white/20 shadow-lg overflow-hidden`}>
      <Image
        src={src}
        alt=""
        fill
        className="object-contain p-1.5"
        sizes={size === 'lg' ? '80px' : '48px'}
        unoptimized
      />
    </div>
  );
}

export function HomeMatchSlider({
  initialMatches = [],
  marketplaceItems = [],
}: {
  initialMatches?: TodayMatchRow[];
  marketplaceItems?: Record<string, unknown>[];
}) {
  const t = useT();
  const [matches, setMatches] = useState<TodayMatchRow[]>(initialMatches);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => {
      fetch(`${getApiUrl()}/fixtures/platform/headline-matches?limit=8`, { cache: 'no-store' })
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

  useEffect(() => {
    if (index >= matches.length) setIndex(0);
  }, [index, matches.length]);

  const pickCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of matches) map.set(m.id, countPicksForMatch(m, marketplaceItems));
    return map;
  }, [matches, marketplaceItems]);

  const goTo = useCallback(
    (next: number) => {
      if (matches.length === 0) return;
      setIndex(((next % matches.length) + matches.length) % matches.length);
    },
    [matches.length],
  );

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    if (paused || matches.length <= 1) return;
    const id = window.setInterval(() => goNext(), AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [paused, matches.length, goNext]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  };

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl md:rounded-3xl border border-white/15 bg-black/30 backdrop-blur-md px-6 py-10 text-center">
        <p className="text-sm text-slate-300">{t('home.today_matches_sub')}</p>
        <Link
          href="/live-scores"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/20"
        >
          {t('home.today_matches_see_all')} →
        </Link>
      </div>
    );
  }

  return (
    <div
      className="relative w-full min-w-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <div
        ref={trackRef}
        className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/20 bg-gradient-to-br from-white/[0.12] via-white/[0.06] to-white/[0.02] backdrop-blur-xl shadow-2xl shadow-black/40"
        role="region"
        aria-roledescription="carousel"
        aria-label={t('home.today_matches_title')}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? 0;
        }}
        onTouchEnd={(e) => {
          const endX = e.changedTouches[0]?.clientX ?? 0;
          const diff = touchStartX.current - endX;
          if (diff > SWIPE_THRESHOLD_PX) goNext();
          else if (diff < -SWIPE_THRESHOLD_PX) goPrev();
        }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(16,185,129,0.18),transparent_70%)]"
          aria-hidden
        />

        <div
          className="flex transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {matches.map((m) => {
            const live = isFixtureLive(m.status);
            const picks = pickCounts.get(m.id) ?? 0;
            return (
              <article
                key={m.id}
                className="w-full shrink-0 px-4 py-6 sm:px-8 sm:py-8 md:px-10 md:py-9"
                aria-hidden={matches[index]?.id !== m.id}
              >
                <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
                    <span className="inline-flex items-center rounded-full border border-white/25 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                      {m.leagueName ?? '—'}
                    </span>
                    {live ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/50 bg-red-500/25 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-red-100">
                        <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" aria-hidden />
                        {formatLiveFixturePeriod(m.status, m.statusElapsed) || 'Live'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-100 tabular-nums">
                        {formatKickoff(m.matchDate)}
                      </span>
                    )}
                  </div>

                  <div className="flex w-full items-center justify-center gap-3 sm:gap-6 md:gap-10">
                    <div className="flex flex-1 flex-col items-center gap-2 min-w-0 max-w-[38%]">
                      <TeamLogo src={m.homeTeamLogo} alt={m.homeTeamName} />
                      <p className="text-sm sm:text-base md:text-lg font-bold text-white leading-tight line-clamp-2">
                        {m.homeTeamName}
                      </p>
                    </div>

                    <div className="flex flex-col items-center shrink-0 px-1">
                      {live ? (
                        <p className="text-3xl sm:text-4xl md:text-5xl font-black text-white tabular-nums tracking-tight leading-none">
                          {m.homeScore ?? 0}
                          <span className="mx-2 text-white/50 font-semibold">–</span>
                          {m.awayScore ?? 0}
                        </p>
                      ) : (
                        <span className="text-lg sm:text-xl font-bold text-white/70 uppercase tracking-widest">
                          vs
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col items-center gap-2 min-w-0 max-w-[38%]">
                      <TeamLogo src={m.awayTeamLogo} alt={m.awayTeamName} />
                      <p className="text-sm sm:text-base md:text-lg font-bold text-white leading-tight line-clamp-2">
                        {m.awayTeamName}
                      </p>
                    </div>
                  </div>

                  {m.spotlightPlayer && (
                    <div className="mt-6 w-full max-w-md flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent px-4 py-3 text-left shadow-lg">
                      {m.spotlightPlayer.playerPhoto ? (
                        <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden ring-2 ring-emerald-400/50 shadow-md">
                          <Image
                            src={m.spotlightPlayer.playerPhoto}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="56px"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/25 text-lg font-bold text-white ring-2 ring-emerald-400/50">
                          {m.spotlightPlayer.playerName.slice(0, 1)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/90">
                          {t('home.today_matches_player_watch')}
                        </p>
                        <p className="text-sm sm:text-base font-bold text-white truncate">
                          {m.spotlightPlayer.playerName}
                        </p>
                        {m.spotlightPlayer.goals != null && m.spotlightPlayer.goals > 0 && (
                          <p className="text-xs text-emerald-100/80">
                            {t('home.today_matches_player_goals', {
                              count: String(m.spotlightPlayer.goals),
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/marketplace?sport=football"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition-colors hover:bg-emerald-400"
                    >
                      {picks > 0
                        ? t('home.today_matches_picks', { count: String(picks) })
                        : t('home.today_matches_browse')}
                    </Link>
                    <Link
                      href={`/matches/${m.id}`}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                    >
                      {t('home.today_matches_details')} →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {matches.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 z-10 hidden sm:flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
              aria-label={t('home.slider_prev')}
            >
              <span aria-hidden className="text-lg leading-none">
                ‹
              </span>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 z-10 hidden sm:flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
              aria-label={t('home.slider_next')}
            >
              <span aria-hidden className="text-lg leading-none">
                ›
              </span>
            </button>
          </>
        )}
      </div>

      {matches.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label={t('home.today_matches_title')}>
          {matches.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={t('home.slider_go_to', { n: String(i + 1) })}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? 'w-7 bg-emerald-400' : 'w-2 bg-white/35 hover:bg-white/55'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
