'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PickCard } from '@/components/PickCard';
import { getApiUrl } from '@/lib/site-config';

interface Pick {
  id: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string;
}

interface Tipster {
  id: number;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  winRate: number;
  totalPicks?: number;
  wonPicks?: number;
  lostPicks?: number;
  rank: number;
}

interface FreeTip {
  id: number;
  title: string;
  totalPicks: number;
  totalOdds: number;
  price: number;
  picks: Pick[];
  tipster?: Tipster | null;
}

export function HomeFreeTipOfTheDay() {
  const router = useRouter();
  const [tip, setTip] = useState<FreeTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);

  useEffect(() => {
    fetch(`${getApiUrl()}/accumulators/free-tip-of-the-day`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setTip(data))
      .catch(() => setTip(null))
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/#free-tip-of-the-day');
      return;
    }
    if (!tip?.id) return;
    setPurchasing(true);
    try {
      const res = await fetch(`${getApiUrl()}/accumulators/${tip.id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIsPurchased(true);
      } else {
        router.push(`/marketplace?highlight=${tip.id}`);
      }
    } catch {
      router.push(`/marketplace?highlight=${tip.id}`);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <section className="py-12 md:py-16 border-t border-[var(--border)] bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Free Tip of the Day</h2>
          <div className="max-w-md h-64 rounded-2xl bg-[var(--card)] animate-pulse" />
        </div>
      </section>
    );
  }

  if (!tip) {
    return null;
  }

  return (
    <section className="py-12 md:py-16 border-t border-[var(--border)] bg-gradient-to-br from-amber-50/50 dark:from-amber-950/20 to-[var(--bg)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-200 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100 text-xs font-semibold mb-2">
              Free
            </span>
            <h2 className="text-2xl font-bold text-[var(--text)]">Free Tip of the Day</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              From {tip.tipster?.displayName ?? 'The Gambler'} — no purchase required
            </p>
          </div>
          <Link
            href="/marketplace"
            className="text-sm font-medium text-[var(--primary)] hover:underline"
          >
            All coupons →
          </Link>
        </div>
        <div className="max-w-lg">
          <PickCard
            id={tip.id}
            title={tip.title}
            totalPicks={tip.totalPicks}
            totalOdds={tip.totalOdds}
            price={0}
            picks={tip.picks}
            tipster={tip.tipster ? { ...tip.tipster, totalPicks: tip.tipster.totalPicks ?? 0, wonPicks: tip.tipster.wonPicks ?? 0, lostPicks: tip.tipster.lostPicks ?? 0 } : null}
            isPurchased={isPurchased}
            canPurchase={!isPurchased}
            onPurchase={handlePurchase}
            purchasing={purchasing}
          />
        </div>
      </div>
    </section>
  );
}
