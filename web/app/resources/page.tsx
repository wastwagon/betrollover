'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { AdSlot } from '@/components/AdSlot';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { getApiUrl } from '@/lib/site-config';

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

const SKILL_OVERVIEW = [
  {
    level: 'beginner',
    icon: '🌱',
    title: 'Beginner',
    desc: "Odds explained, how to read a tipster's picks, and what to look for before you buy a coupon.",
  },
  {
    level: 'intermediate',
    icon: '📈',
    title: 'Intermediate',
    desc: 'Bankroll management, value picks, and using ROI & win rate to compare tipsters objectively.',
  },
  {
    level: 'advanced',
    icon: '🧠',
    title: 'Advanced',
    desc: 'Multi-leg accumulator strategy, expected value, and portfolio-style multi-sport tipster selection.',
  },
];

export default function ResourcesPage() {
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
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        <PageHeader
          label="Tipster Guides"
          title="Guides & Resources"
          tagline="From reading odds and evaluating tipsters to advanced multi-sport accumulator strategies — make sharper, more informed decisions."
        />

        {/* Skill level overview cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {SKILL_OVERVIEW.map(card => (
            <div key={card.level} className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
              <p className="text-3xl mb-2">{card.icon}</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mb-2 ${LEVEL_COLORS[card.level]}`}>
                {LEVEL_LABELS[card.level]}
              </span>
              <h3 className="font-semibold text-[var(--text)] mb-1">{card.title}</h3>
              <p className="text-sm text-[var(--text-muted)]">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Sport filter row */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">Filter by Sport</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {SPORT_FILTERS.map(sf => (
              <button
                key={sf.key}
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
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">

            {/* Non-football coming-soon banner */}
            {sportMeta?.comingSoon && (
              <div className="mb-6 p-5 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-light)]/10">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{sportMeta.icon}</span>
                  <div>
                    <h3 className="font-bold text-[var(--text)] mb-1">{sportMeta.label} Guides — Coming Soon</h3>
                    <p className="text-sm text-[var(--text-muted)] mb-3">
                      Sport-specific {sportMeta.label.toLowerCase()} strategy guides are in development. The universal guides below apply across all sports and are a great starting point.
                    </p>
                    <Link
                      href={`/marketplace?sport=${activeSport}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline"
                    >
                      Browse {sportMeta.label} tipster picks →
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
                <p className="font-semibold text-[var(--text)] mb-1">Guides coming soon</p>
                <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto mb-5">
                  We&apos;re building in-depth tipster guides covering odds, bankroll management, and multi-sport accumulator strategies.
                  In the meantime, browse verified tipster picks in the marketplace.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/marketplace" className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors">
                    Browse Marketplace →
                  </Link>
                  <Link href="/news" className="px-5 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-semibold text-[var(--text)] hover:border-[var(--primary)] transition-colors">
                    Read Latest News
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {categories.map(cat => (
                  <section key={cat.id} className="rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-hidden">
                    <div className="px-6 py-5 border-b border-[var(--border)] flex items-center gap-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${LEVEL_COLORS[cat.level] ?? 'bg-slate-100 text-slate-600'}`}>
                        {LEVEL_LABELS[cat.level] ?? cat.level}
                      </span>
                      <h2 className="text-lg font-bold text-[var(--text)]">{cat.name}</h2>
                    </div>
                    {cat.description && (
                      <p className="px-6 pt-4 text-sm text-[var(--text-muted)]">{cat.description}</p>
                    )}
                    <div className="p-6 grid sm:grid-cols-2 gap-3">
                      {(cat.items ?? []).length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] col-span-2">No items yet — check back soon.</p>
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
          <aside className="lg:w-72 flex-shrink-0">
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
