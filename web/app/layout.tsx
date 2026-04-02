import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { DM_Sans } from 'next/font/google';
import { QueryProvider } from '@/components/QueryProvider';
import { SlipCartProvider } from '@/context/SlipCartContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { LanguageProvider, type SupportedLanguage } from '@/context/LanguageContext';
import { TopBar } from '@/components/TopBar';
import { SkipToMainContent } from '@/components/SkipToMainContent';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { AnalyticsBeacon } from '@/components/AnalyticsBeacon';
import { GoogleTagManagerNoScript } from '@/components/GoogleTagManagerNoScript';
import { ThirdPartyTags } from '@/components/ThirdPartyTags';
import { JsonLdScript } from '@/components/JsonLdScript';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS } from '@/lib/site-config';
import './globals.css';

const SUPPORTED_LOCALES: SupportedLanguage[] = ['en', 'fr'];

async function getInitialLocale(): Promise<SupportedLanguage> {
  try {
    const c = await cookies();
    const val = c.get('br_language')?.value as SupportedLanguage | undefined;
    return val && SUPPORTED_LOCALES.includes(val) ? val : 'en';
  } catch {
    return 'en';
  }
}

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
});

// Ensure we only pass a string to className (avoids "Objects are not valid as React child" during hydration)
const fontClassName = typeof dmSans?.variable === 'string' ? dmSans.variable : '';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Verified Sports Tips | Football, Basketball & More — ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/BetRollover-logo.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.svg',
    apple: '/BetRollover-logo.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en',
    alternateLocale: ['en_GH', 'en_GB', 'en_US', 'en_NG', 'en_ZA', 'en_KE', 'fr'],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `Verified Sports Tips | Football, Basketball & More — ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: [{ url: '/og-image.png', type: 'image/png', width: 1200, height: 630, alt: `${SITE_NAME} — verified sports tips marketplace` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Verified Sports Tips | Football, Basketball & More — ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    creator: '@betrollover',
    images: [{ url: '/og-image.png', type: 'image/png', alt: `${SITE_NAME} — verified sports tips marketplace` }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'sports',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#10b981',
  viewportFit: 'cover',
};

/** Server-only: set `DISABLE_THIRD_PARTY_TAGS=1` in Coolify to stop GTM/GA without rebuilding the image. */
function thirdPartyTagsDisabled(): boolean {
  return process.env.DISABLE_THIRD_PARTY_TAGS === '1';
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getInitialLocale();
  const offThirdParty = thirdPartyTagsDisabled();

  return (
    <html lang={locale} className={fontClassName}>
      <body className="min-h-screen bg-[var(--bg)] font-sans antialiased">
        {!offThirdParty && <GoogleTagManagerNoScript />}
        <JsonLdScript />
        <ThirdPartyTags disabled={offThirdParty} />
        <AnalyticsBeacon />
        <QueryProvider>
          <LanguageProvider initialLocale={locale}>
            <CurrencyProvider>
              <SlipCartProvider>
                <SkipToMainContent />
                <TopBar />
                <div
                  id="main-content"
                  role="main"
                  tabIndex={-1}
                  className="min-h-screen min-w-0 max-w-full overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom,0px))] xl:pb-0"
                >
                  {children}
                </div>
                <MobileBottomNav />
              </SlipCartProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
