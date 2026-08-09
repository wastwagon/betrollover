import type { Metadata } from 'next';
import { privateAreaMetadata } from '@/lib/seo/private-metadata';

export const metadata: Metadata = {
  ...privateAreaMetadata,
  title: 'Acca Generator',
};

export default function AccaGeneratorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
