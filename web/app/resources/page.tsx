'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { AdSlot } from '@/components/AdSlot';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { buttonClassName } from '@/components/ui/Button';
import {
  CONTENT_SPORT_KEYS,
  SPORT_ICONS,
  SPORT_META,
  getContentSportLabel,
  type ContentSport,
  type ContentSportFilter,
} from '@/lib/sports-content';

interface ResourceItem {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  type: string;
  durationMinutes: number | null;
}

interface ResourceCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  level: string;
  items: ResourceItem[];
}

const LEVEL_COLORS: Record<string, string> = {
  beginner:     'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100   text-amber-700',
  advanced:     'bg-red-100     text-red-700',
};

const TYPE_ICONS: Record<string, string> = {
  article:  '📄',
  strategy: '♟️',
  tool:     '🛠️',
};

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

const TYPE_LABELS: Record<string, string> = {
  article:  'Article',
  strategy: 'Strategy',
  tool:     'Tool',
};

const SPORT_FILTERS = CONTENT_SPORT_KEYS.map((key) => ({
  key,
  icon: SPORT_ICONS[key],
  label: key ? SPORT_META[key as ContentSportFilter].label : 'All Sports',
}));

const SKILL_OVERVIEW_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

const SKILL_OVERVIEW: {
  level: (typeof SKILL_OVERVIEW_LEVELS)[number];
  title: string;
}[] = [
  { level: 'beginner', title: 'Beginner' },
  { level: 'intermediate', title: 'Intermediate' },
  { level: 'advanced', title: 'Advanced' },
];

const SKILL_OVERVIEW_DESC_KEYS: Record<(typeof SKILL_OVERVIEW_LEVELS)[number], string> = {
  beginner: 'resources.skill_overview_beginner_desc',
  intermediate: 'resources.skill_overview_intermediate_desc',
  advanced: 'resources.skill_overview_advanced_desc',
};

export default function ResourcesPage() {
  const t = useT();
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSport, setActiveSport] = useState<ContentSport>('');

  useEffect(() => {
    setLoading(true);
    const params = activeSport ? `?sport=${encodeURIComponent(activeSport)}` : '';
    fetch(`${getApiUrl()}/resources/categories${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, [activeSport]);

  const sportMeta = activeSport ? SPORT_META[activeSport] : null;
  const visibleCategories = categories.filter(cat => (cat.items?.length ?? 0) > 0);

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page-wide w-full min-w-0">

        <PageHeader
          label={t('nav.guides')}
          title={t('resources.page_title')}
          tagline={t('resources.page_tagline')}
        />

        <p className="mb-6 text-sm text-[var(--text-muted)]">
          {t('resources.new_to_platform')}{' '}
          <Link href="/how-it-works#faq" className="font-medium text-[var(--primary)] hover:underline">
            How it works &amp; FAQs
          </Link>
          {' · '}
          <Link href="/learn" className="font-medium text-[var(--primary)] hover:underline">
            {t('learn.resources_link')}
          </Link>
        </p>

        <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--card)]/60 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">Popular Guides</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/guides/escrow-refunds"
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm font-medium text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              How escrow refunds work →
            </Link>
            <Link
              href="/guides/evaluate-tipsters"
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm font-medium text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              How to evaluate tipsters before buying →
            </Link>
          </div>
        </section>

        {/* Skill level overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {SKILL_OVERVIEW.map(card => (
            <div key={card.level} className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mb-2 ${LEVEL_COLORS[card.level]}`}>
                {LEVEL_LABELS[card.level]}
              </span>
              <h3 className="font-semibold text-[var(--text)] mb-1">{card.title}</h3>
              <p className="text-sm text-[var(--text-muted)]">{t(SKILL_OVERVIEW_DESC_KEYS[card.level])}</p>
            </div>
          ))}
        </div>

        {/* Sport filter row */}
        <div className="mb-8 w-full min-w-0 overflow-hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
            {t('resources.filter_by_sport')}
          </p>
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch]">
            {SPORT_FILTERS.map(sf => (
              <button
                key={sf.key}
                type="button"
                onClick={() => setActiveSport(sf.key)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeSport === sf.key
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--text)]'
                }`}
              >
                <span>{sf.icon}</span><span>{sf.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main layout — guides + sidebar */}
        <div className="flex flex-col lg:flex-row gap-8 min-w-0">
          <div className="flex-1 min-w-0">

            {sportMeta && (
              <div className="mb-6 p-5 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-light)]/10">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <span className="text-4xl shrink-0">{sportMeta.icon}</span>
                  <div>
                    <h3 className="font-bold text-[var(--text)] mb-1">
                      {t('resources.sport_guides_title', { sport: sportMeta.label })}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mb-3">
                      {t('resources.sport_guides_desc', { sport: sportMeta.label })}
                    </p>
                    <Link
                      href={`/marketplace?sport=${activeSport}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline"
                    >
                      {t('resources.browse_sport_tipster_picks', { sport: sportMeta.label })}
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-8">
                {[1, 2, 3].map(i => <LoadingSkeleton key={i} count={1} className="h-56 rounded-2xl" />)}
              </div>
            ) : visibleCategories.length === 0 ? (
              <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-12 text-center">
                <p className="font-display text-lg font-semibold text-[var(--text)] mb-1">{t('resources.empty_guides_title')}</p>
                <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto mb-5">
                  {t('resources.empty_guides_body')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/marketplace" className={buttonClassName({ size: 'sm' })}>
                    {t('resources.cta_browse_marketplace')}
                  </Link>
                  <Link href="/news" className={buttonClassName({ variant: 'secondary', size: 'sm' })}>
                    {t('resources.cta_read_news')}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {visibleCategories.map(cat => (
                  <section key={cat.id} className="rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-hidden">
                    <div className="px-4 sm:px-6 py-5 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <span className={`inline-flex w-fit px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${LEVEL_COLORS[cat.level] ?? 'bg-slate-100 text-slate-600'}`}>
                        {LEVEL_LABELS[cat.level] ?? cat.level}
                      </span>
                      <h2 className="text-lg font-bold text-[var(--text)] min-w-0">{cat.name}</h2>
                    </div>
                    {cat.description && (
                      <p className="px-6 pt-4 text-sm text-[var(--text-muted)]">{cat.description}</p>
                    )}
                    <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(cat.items ?? []).length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] sm:col-span-2">{t('resources.category_no_items')}</p>
                      ) : (
                        (cat.items ?? []).map(item => (
                          <Link
                            key={item.id}
                            href={`/resources/${cat.slug}/${item.slug}`}
                            className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary-light)]/10 transition-all group"
                          >
                            <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[item.type] ?? '📄'}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase text-[var(--primary)]">
                                  {TYPE_LABELS[item.type] ?? item.type}
                                </span>
                                {item.durationMinutes && (
                                  <span className="text-[10px] text-[var(--text-muted)]">{item.durationMinutes} min</span>
                                )}
                              </div>
                              <h3 className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition-colors leading-snug">
                                {item.title}
                              </h3>
                              {item.excerpt && (
                                <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{item.excerpt}</p>
                              )}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:w-72 flex-shrink-0 min-w-0 w-full">
            <div className="lg:sticky lg:top-24 space-y-4">
              <AdSlot zoneSlug="guides-sidebar" />
              <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <h3 className="text-sm font-bold text-[var(--text)] mb-3">Sports News</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                  Stay up to date with transfers, injury reports, and team news across all sports.
                </p>
                <Link href="/news" className={buttonClassName({ variant: 'secondary', size: 'sm', fullWidth: true })}>
                  Read News →
                </Link>
              </div>
              <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <h3 className="text-sm font-bold text-[var(--text)] mb-3">Leaderboard</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                  See which tipsters rank highest in win rate, ROI, and consistency across all sports.
                </p>
                <Link href="/leaderboard" className={buttonClassName({ variant: 'secondary', size: 'sm', fullWidth: true })}>
                  View Leaderboard →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
