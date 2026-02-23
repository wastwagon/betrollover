import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-config';

export const metadata: Metadata = {
  title: `Support & Disputes | ${SITE_NAME}`,
  description: 'Get help, raise a dispute, or report an issue. Our support team reviews all tickets promptly.',
  openGraph: {
    title: `Support & Disputes | ${SITE_NAME}`,
    description: 'Raise a support ticket or dispute. We respond within 24 hours.',
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
