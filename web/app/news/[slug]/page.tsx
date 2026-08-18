import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { buttonClassName } from '@/components/ui/Button';
import { getLocale, buildT } from '@/lib/i18n';
import {
  fetchNewsArticleBySlug,
  fetchRelatedNewsArticles,
  type NewsArticlePublic,
} from '@/lib/seo/public-content';

const CATEGORY_COLORS: Record<string, string> = {
  news:                'bg-blue-100 text-blue-700',
  transfer_rumour:     'bg-amber-100 text-amber-700',
  confirmed_transfer:  'bg-emerald-100 text-emerald-700',
  injury:              'bg-red-100 text-red-700',
  gossip:              'bg-[var(--accent-light)] text-[var(--accent)]',
};

const SPORT_ICONS: Record<string, string> = {
  football: '⚽', basketball: '🏀', rugby: '🏉', mma: '🥊',
  volleyball: '🏐', hockey: '🏒', american_football: '🏈', tennis: '🎾',
};

function getCategoryLabel(t: (k: string) => string, cat: string): string {
  const map: Record<string, string> = {
    news: 'news.category_detail_news',
    transfer_rumour: 'news.category_detail_transfer_rumour',
    confirmed_transfer: 'news.category_detail_confirmed_transfer',
    injury: 'news.category_detail_injury',
    gossip: 'news.category_detail_gossip',
  };
  return t(map[cat] ?? cat);
}

function getSportLabel(t: (k: string) => string, sport: string): string {
  return t(`create_pick.sport_${sport}` as 'create_pick.sport_football');
}

function formatDate(s: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = buildT(locale);
  const article = await fetchNewsArticleBySlug(slug, locale);

  if (!article) notFound();

  const related = await fetchRelatedNewsArticles(locale, article.slug, article.sport);
  const sportLabel = article.sport ? getSportLabel(t, article.sport) : '';
  const categoryLabel = getCategoryLabel(t, article.category || 'news');

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page-wide w-full min-w-0">
        <PageHeader
          label={categoryLabel}
          title={article.title}
          tagline={
            article.excerpt?.trim() ||
            [article.sport ? `${SPORT_ICONS[article.sport]} ${sportLabel}` : '', article.publishedAt ? formatDate(article.publishedAt) : '']
              .filter(Boolean)
              .join(' · ') ||
            undefined
          }
        />

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 mb-6">
          <Link
            href="/news"
            className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full sm:w-auto"
          >
            ← {t('nav.news')}
          </Link>
          {article.sport ? (
            <Link
              href={`/news?sport=${article.sport}`}
              className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full sm:w-auto"
            >
              {SPORT_ICONS[article.sport]} {sportLabel}
            </Link>
          ) : null}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 min-w-0">
          <article className="flex-1 min-w-0">
            {article.imageUrl && (
              <div className="relative w-full h-64 sm:h-80 mb-8 rounded-2xl overflow-hidden bg-[var(--card)]">
                <Image
                  src={article.imageUrl}
                  alt={article.title}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 700px"
                  priority
                />
              </div>
            )}

            <div className="prose prose-slate max-w-none min-w-0 text-[var(--text)] text-[15px] leading-relaxed
              [&>p]:mb-5 [&>p]:text-[var(--text)] [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-3
              [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-2
              [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>li]:mb-1
              [&>blockquote]:border-l-4 [&>blockquote]:border-[var(--primary)]/40 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-[var(--text-muted)]"
            >
              {(article.content || '').trim()
                ? (article.content || '').split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)
                : <p className="text-[var(--text-muted)] italic">{t('news.full_content_unavailable')}</p>}
            </div>

            {article.sourceUrl && (
              <div className="mt-8 pt-6 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)]">
                  {t('news.source')}:{' '}
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline break-all"
                  >
                    {article.sourceUrl}
                  </a>
                </p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <Link
                href={article.sport ? `/news?sport=${article.sport}` : '/news'}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline"
              >
                {t('news.back_to_news')}
              </Link>
            </div>
          </article>

          <aside className="w-full lg:w-72 flex-shrink-0 min-w-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              <AdSlot zoneSlug="news-article-sidebar" />

              {related.length > 0 && (
                <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <h2 className="text-sm font-bold text-[var(--text)]">
                      {sportLabel ? t('news.sidebar_more_sport_news', { sport: sportLabel }) : t('news.sidebar_more_news')}
                    </h2>
                  </div>
                  <ul className="divide-y divide-[var(--border)]">
                    {related.map((rel) => (
                      <RelatedRow key={rel.slug} rel={rel} t={t} fallbackSport={article.sport} />
                    ))}
                  </ul>
                  <div className="px-4 py-3 border-t border-[var(--border)]">
                    <Link
                      href={article.sport ? `/news?sport=${article.sport}` : '/news'}
                      className="text-xs font-semibold text-[var(--primary)] hover:underline"
                    >
                      {sportLabel ? t('news.sidebar_view_all_news', { sport: sportLabel }) : t('news.sidebar_view_all')}
                    </Link>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-[var(--separator)] bg-[var(--card)] p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">{t('news.sidebar_tipster_title')}</p>
                <h3 className="font-display font-semibold text-base mb-2 text-[var(--text)]">
                  {t('news.sidebar_tipster_sub', { sport: sportLabel || t('common.all') })}
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
                  {t('news.sidebar_top_tipsters_desc')}
                </p>
                <Link
                  href={article.sport ? `/marketplace?sport=${article.sport}` : '/marketplace'}
                  className={buttonClassName({ size: 'sm', fullWidth: true })}
                >
                  {t('news.sidebar_tipster_btn', { sport: sportLabel || '' })}
                </Link>
              </div>

              <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4">
                <h3 className="text-sm font-bold text-[var(--text)] mb-2">{t('news.sidebar_discover_title')}</h3>
                <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
                  {t('news.sidebar_discover_desc')}
                </p>
                <Link href="/resources" className="text-xs font-semibold text-[var(--primary)] hover:underline">
                  {t('news.sidebar_discover_browse')}
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

function RelatedRow({
  rel,
  t,
  fallbackSport,
}: {
  rel: NewsArticlePublic;
  t: (k: string, vars?: Record<string, string>) => string;
  fallbackSport?: string;
}) {
  return (
    <li>
      <Link
        href={`/news/${rel.slug}`}
        className="flex gap-3 p-3 hover:bg-[var(--bg)] transition-colors group"
      >
        {rel.imageUrl ? (
          <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
            <Image
              src={rel.imageUrl} alt={rel.title}
              width={56} height={56}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-[var(--primary-light)] flex items-center justify-center text-xl">
            {fallbackSport ? SPORT_ICONS[fallbackSport] : '📰'}
          </div>
        )}
        <div className="min-w-0">
          <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mb-1 ${CATEGORY_COLORS[rel.category || ''] ?? 'bg-slate-100 text-slate-600'}`}>
            {getCategoryLabel(t, rel.category || 'news')}
          </span>
          <p className="text-xs font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors leading-snug line-clamp-2">
            {rel.title}
          </p>
          {rel.publishedAt && (
            <p className="text-[10px] text-[var(--text-muted)] mt-1">{formatDate(rel.publishedAt)}</p>
          )}
        </div>
      </Link>
    </li>
  );
}
