import Link from 'next/link';
import { preload } from 'react-dom';
import { buttonClassName } from '@/components/ui/button-styles';
import { getLocale, buildT } from '@/lib/i18n';
import { HERO_LCP_MOBILE_AVIF, HERO_LCP_DESKTOP_AVIF } from '@/lib/marketing-assets';

/**
 * Static hero. Kept out of the homepage data fetch so the LCP image and H1
 * can be sent before marketplace and leaderboard requests finish.
 */
export async function HomeHeroBanner() {
  const t = buildT(await getLocale());

  preload(HERO_LCP_MOBILE_AVIF, {
    as: 'image',
    fetchPriority: 'high',
    type: 'image/avif',
  });
  preload(HERO_LCP_DESKTOP_AVIF, {
    as: 'image',
    fetchPriority: 'high',
    type: 'image/avif',
  });

  return (
    <section
      className="relative w-full min-w-0 overflow-hidden text-white"
      aria-labelledby="home-hero-title"
    >
      <div className="absolute inset-0">
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet={HERO_LCP_MOBILE_AVIF}
            type="image/avif"
          />
          <source
            media="(min-width: 768px)"
            srcSet={HERO_LCP_DESKTOP_AVIF}
            type="image/avif"
          />
          <source
            media="(max-width: 767px)"
            srcSet="/images/marketing/hero-stadium-800.webp"
            type="image/webp"
          />
          <source
            media="(min-width: 768px)"
            srcSet="/images/marketing/hero-stadium-1280.webp"
            type="image/webp"
          />
          <img
            src={HERO_LCP_MOBILE_AVIF}
            alt=""
            width={800}
            height={533}
            fetchPriority="high"
            decoding="sync"
            className="absolute inset-0 h-full w-full object-cover object-[center_42%] brightness-[1.04] contrast-[1.02] saturate-[1.08]"
          />
        </picture>
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(105deg, rgba(4, 22, 18, 0.72) 0%, rgba(4, 22, 18, 0.45) 32%, rgba(4, 22, 18, 0.12) 58%, transparent 72%), linear-gradient(180deg, transparent 40%, rgba(4, 22, 18, 0.5) 100%)',
          }}
          aria-hidden
        />
      </div>

      <div className="relative mx-auto flex min-h-[min(68svh,480px)] w-full max-w-7xl flex-col justify-end px-4 pb-8 pt-14 sm:min-h-[400px] sm:px-6 sm:pb-10 sm:pt-16 lg:px-8 lg:pb-12">
        <div className="max-w-xl">
          <p className="mb-3 max-w-full rounded-2xl border border-white/25 bg-black/35 px-3 py-1.5 text-[10px] font-semibold uppercase leading-snug tracking-[0.12em] text-white/95 sm:text-[11px]">
            {t('home.hero_badge')}
          </p>
          <h1
            id="home-hero-title"
            className="max-w-lg text-[1.65rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-4xl"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.65), 0 2px 18px rgba(0,0,0,0.4)' }}
          >
            {t('home.hero_title')}
          </h1>
          <p
            className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-white sm:text-[15px]"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.65), 0 2px 18px rgba(0,0,0,0.4)' }}
          >
            {t('home.hero_escrow_line')}
          </p>
        </div>

        <div className="mt-5 flex w-full max-w-md flex-col gap-2.5 sm:mt-7 sm:max-w-none sm:flex-row sm:flex-wrap">
          <Link
            href="/marketplace"
            className={buttonClassName({ className: 'flex-1 sm:flex-none sm:min-w-[10.5rem] min-h-[48px]' })}
          >
            {t('home.hero_cta_primary')}
          </Link>
          <Link
            href="/buy-football-tips"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-white/45 bg-white/15 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/25 sm:flex-none sm:min-w-[10.5rem]"
          >
            {t('home.hero_cta_vip')}
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-[48px] items-center justify-center px-2 py-3 text-sm font-semibold text-white underline-offset-4 hover:underline sm:px-4"
          >
            {t('home.hero_cta_secondary')} →
          </Link>
        </div>
      </div>
    </section>
  );
}
