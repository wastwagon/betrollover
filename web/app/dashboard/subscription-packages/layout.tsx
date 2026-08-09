import { redirect } from 'next/navigation';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';

/** Tipster VIP package manager — hidden while subscriptions are disabled. */
export default function SubscriptionPackagesLayout({ children }: { children: React.ReactNode }) {
  if (!isSubscriptionsEnabled()) {
    redirect('/dashboard');
  }
  return children;
}
