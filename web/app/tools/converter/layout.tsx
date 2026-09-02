import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

const TITLE = 'GHS Currency Converter';
const DESCRIPTION =
  'Convert Ghana Cedi to major currencies. Reference rates only — BetRollover transactions are in GHS.';

const canonical = `${SITE_URL.replace(/\/$/, '')}/tools/converter`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical },
  openGraph: {
    url: canonical,
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function ConverterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
