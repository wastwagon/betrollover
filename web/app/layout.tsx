import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import { QueryProvider } from '@/components/QueryProvider';
import { AnalyticsBeacon } from '@/components/AnalyticsBeacon';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'BetRollover — Your Shield Against Losses',
  description:
    'Risk-free football betting tips with escrow protection. Win or get your money back.',
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
        <AnalyticsBeacon />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
