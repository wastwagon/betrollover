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

type ResourceSport = '' | 'football' | 'basketball' | 'rugby' | 'mma' | 'volleyball' | 'hockey' | 'american_football' | 'tennis';

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

const SPORT_FILTERS: { key: ResourceSport; icon: string; label: string }[] = [
  { key: '',                  icon: '🌍', label: 'All Sports' },
  { key: 'football',          icon: '⚽', label: 'Football' },
  { key: 'basketball',        icon: '🏀', label: 'Basketball' },
  { key: 'rugby',             icon: '🏉', label: 'Rugby' },
  { key: 'mma',               icon: '🥊', label: 'MMA' },
  { key: 'volleyball',        icon: '🏐', label: 'Volleyball' },
  { key: 'hockey',            icon: '🏒', label: 'Hockey' },
  { key: 'american_football', icon: '🏈', label: 'Amer. Football' },
  { key: 'tennis',            icon: '🎾', label: 'Tennis' },
];

const SPORT_META: Record<string, { icon: string; label: string; comingSoon?: boolean }> = {
  football:          { icon: '⚽', label: 'Football' },
  basketball:        { icon: '🏀', label: 'Basketball',    comingSoon: true },
  rugby:             { icon: '🏉', label: 'Rugby',          comingSoon: true },
  mma:               { icon: '🥊', label: 'MMA',            comingSoon: true },
  volleyball:        { icon: '🏐', label: 'Volleyball',     comingSoon: true },
  hockey:            { icon: '🏒', label: 'Hockey',         comingSoon: true },
  american_football: { icon: '🏈', label: 'Amer. Football', comingSoon: true },
  tennis:            { icon: '🎾', label: 'Tennis',         comingSoon: true },
};

const SKILL_OVERVIEW_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

const SKILL_OVERVIEW: {
  level: (typeof SKILL_OVERVIEW_LEVELS)[number];
  icon: string;
  title: string;
}[] = [
  { level: 'beginner', icon: '🌱', title: 'Beginner' },
  { level: 'intermediate', icon: '📈', title: 'Intermediate' },
  { level: 'advanced', icon: '🧠', title: 'Advanced' },
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
  const [activeSport, setActiveSport] = useState<ResourceSport>('');

  useEffect(() => {
    fetch(`${getApiUrl()}/resources/categories`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const sportMeta = activeSport ? SPORT_META[activeSport] : null;

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
              <p className="text-3xl mb-2">{card.icon}</p>
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

            {/* Non-football coming-soon banner */}
            {sportMeta?.comingSoon && (
              <div className="mb-6 p-5 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-light)]/10">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <span className="text-4xl shrink-0">{sportMeta.icon}</span>
                  <div>
                    <h3 className="font-bold text-[var(--text)] mb-1">
                      {t('resources.sport_guides_coming_title', { sport: sportMeta.label })}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mb-3">
                      {t('resources.sport_guides_coming_desc', { sportLower: sportMeta.label.toLowerCase() })}
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
            ) : categories.length === 0 ? (
              <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-12 text-center">
                <p className="text-4xl mb-3">📚</p>
                <p className="font-semibold text-[var(--text)] mb-1">{t('resources.empty_guides_title')}</p>
                <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto mb-5">
                  {t('resources.empty_guides_body')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/marketplace" className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors">
                    {t('resources.cta_browse_marketplace')}
                  </Link>
                  <Link href="/news" className="px-5 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-semibold text-[var(--text)] hover:border-[var(--primary)] transition-colors">
                    {t('resources.cta_read_news')}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {categories.map(cat => (
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
            <div className="sticky top-24 space-y-4">
              <AdSlot zoneSlug="guides-sidebar" />
              <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <h3 className="text-sm font-bold text-[var(--text)] mb-3">📰 Sports News</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                  Stay up to date with transfers, injury reports, and team news across all sports.
                </p>
                <Link href="/news" className="block w-full text-center px-4 py-2 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] text-sm font-semibold hover:bg-[var(--primary)] hover:text-white transition-colors">
                  Read News →
                </Link>
              </div>
              <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <h3 className="text-sm font-bold text-[var(--text)] mb-3">🏆 Leaderboard</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                  See which tipsters rank highest in win rate, ROI, and consistency across all sports.
                </p>
                <Link href="/leaderboard" className="block w-full text-center px-4 py-2 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] text-sm font-semibold hover:bg-[var(--primary)] hover:text-white transition-colors">
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
