import { redirect } from 'next/navigation';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';

/** Hide all public VIP / subscription routes while the feature flag is off. */
export default function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  if (!isSubscriptionsEnabled()) {
    redirect('/marketplace');
  }
  return children;
}
