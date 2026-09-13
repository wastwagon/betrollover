import { redirect } from 'next/navigation';
import { isHumanVipPackagesEnabled, isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';

/** Tipster VIP package manager — hidden while subscriptions or human VIP plans are disabled. */
export default function SubscriptionPackagesLayout({ children }: { children: React.ReactNode }) {
  if (!isSubscriptionsEnabled() || !isHumanVipPackagesEnabled()) {
    redirect(isSubscriptionsEnabled() ? '/subscriptions/marketplace' : '/dashboard');
  }
  return children;
}
