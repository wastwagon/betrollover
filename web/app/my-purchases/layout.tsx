import type { Metadata } from 'next';
import { privateAreaMetadata } from '@/lib/seo/private-metadata';

export const metadata: Metadata = privateAreaMetadata;

export default function MyPurchasesSegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
