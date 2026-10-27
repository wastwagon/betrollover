import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
import { getLocale, serverT } from '@/lib/i18n';

/** Hide all public VIP / subscription routes while the feature flag is off. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: serverT('subscriptions.page_title', locale),
    description: serverT('seo.subscriptions_account_desc', locale),
    robots: { index: false, follow: true },
  };
}

export default function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  if (!isSubscriptionsEnabled()) {
    redirect('/marketplace');
  }
  return children;
}
