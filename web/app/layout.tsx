import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import { QueryProvider } from '@/components/QueryProvider';
import { AnalyticsBeacon } from '@/components/AnalyticsBeacon';
import { JsonLdScript } from '@/components/JsonLdScript';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS } from '@/lib/site-config';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Your Shield Against Losses`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_GH',
    alternateLocale: ['en_NG', 'en_ZA', 'en_KE'],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Your Shield Against Losses`,
    description: SITE_DESCRIPTION,
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: `${SITE_NAME} - Africa's Premier Tipster Marketplace` },
      { url: '/favicon.svg', width: 512, height: 512, alt: SITE_NAME },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Your Shield Against Losses`,
    description: SITE_DESCRIPTION,
    creator: '@betrollover',
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="min-h-screen bg-[var(--bg)] font-sans antialiased">
        <JsonLdScript />
        <AnalyticsBeacon />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
