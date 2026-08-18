import type { Metadata } from 'next';
import { seoAlternates } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: 'Support & Disputes',
    description: 'Get help, raise a dispute, or report an issue. Our support team reviews all tickets promptly.',
    alternates: seoAlternates('/support', locale),
    openGraph: {
      title: 'Support & Disputes',
      description:
        'Raise a support ticket or dispute. Support replies are typically within 24 hours (Mon–Fri); wallet and payment disputes within 48 hours.',
    },
  };
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
