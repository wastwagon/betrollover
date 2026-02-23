'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useT } from '@/context/LanguageContext';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { getApiUrl } from '@/lib/site-config';

// Load chart lazily — avoids SSR issues with recharts
const AreaChart    = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area         = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const XAxis        = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis        = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip      = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

// ─── Types ─────────────────────────────────────────────────────────────────────
interface WalletTransaction {
  id: number;
  type: string;
  amount: string | number;
  currency?: string;
  status: string;
  reference?: string | null;
  description?: string | null;
  createdAt: string;
}

interface MyCoupon {
  id: number;
  title: string;
  sport?: string;
  price: number;
  totalOdds: number;
  totalPicks: number;
  result?: string;
  status?: string;
  purchaseCount?: number;
  createdAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TX_TYPE_KEYS: Record<string, string> = {
  payout:     'earnings.tx_pick_won',
  commission: 'earnings.tx_platform_fee',
  refund:     'earnings.tx_escrow_refund',
  deposit:    'earnings.tx_deposit',
  withdrawal: 'earnings.tx_withdrawal',
  purchase:   'earnings.tx_purchase',
  credit:     'wallet.credit',
};

const TX_COLOR: Record<string, string> = {
  payout:     'text-emerald-600',
  commission: 'text-amber-600',
  refund:     'text-amber-600',
  deposit:    'text-blue-600',
  withdrawal: 'text-red-500',
  purchase:   'text-slate-500',
  credit:     'text-teal-600',
};

const TX_ICON: Record<string, string> = {
  payout:     '💰',
  commission: '🏛',
  refund:     '↩',
  deposit:    '⬆',
  withdrawal: '💸',
  purchase:   '🛒',
  credit:     '✨',
};

const RESULT_STYLE: Record<string, string> = {
  won:     'bg-emerald-100 text-emerald-700',
  lost:    'bg-red-100 text-red-700',
  pending: 'bg-amber-50 text-amber-700',
  void:    'bg-gray-100 text-gray-500',
};

const SPORT_META: Record<string, { icon: string }> = {
  Football: { icon: '⚽' }, Basketball: { icon: '🏀' }, Rugby: { icon: '🏉' },
  MMA: { icon: '🥊' }, Volleyball: { icon: '🏐' }, Hockey: { icon: '🏒' },
  'American Football': { icon: '🏈' }, Tennis: { icon: '🎾' }, 'Multi-Sport': { icon: '🌍' },
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatMonth(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function EarningsPage() {
  const router = useRouter();
  const t = useT();

  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [coupons, setCoupons] = useState<MyCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<'all' | 'payout' | 'commission' | 'withdrawal'>('all');

  const [reviewSummary, setReviewSummary] = useState<{ avg: number; total: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login?redirect=/earnings'); return; }
    const h = { Authorization: `Bearer ${token}` };

    // Decode user id from JWT for reviews lookup
    let userId: number | null = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub ?? null;
    } catch { /* ignore */ }

    Promise.all([
      fetch(`${getApiUrl()}/wallet/balance`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch(`${getApiUrl()}/wallet/transactions?limit=100`, { headers: h }).then(r => r.ok ? r.json() : []),
      fetch(`${getApiUrl()}/accumulators/my`, { headers: h }).then(r => r.ok ? r.json() : []),
      userId ? fetch(`${getApiUrl()}/reviews/tipster/${userId}?limit=1`).then(r => r.ok ? r.json() : null) : Promise.resolve(null),
    ]).then(([balData, txData, couponData, revData]) => {
      if (balData) setBalance(Number(balData.balance));
      setTransactions(Array.isArray(txData) ? txData : []);
      setTransactions(Array.isArray(txData) ? txData : (txData?.items ?? []));
      setCoupons(Array.isArray(couponData) ? couponData : (couponData?.items ?? []));
      if (revData?.total > 0) setReviewSummary({ avg: revData.avg, total: revData.total });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  // Net payouts credited to wallet (after commission deduction)
  const totalEarned = useMemo(() =>
    transactions.filter(t => t.type === 'payout' && t.status !== 'failed')
      .reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );

  // Total platform commission deducted (informational — not a wallet debit)
  const totalCommissionDeducted = useMemo(() =>
    transactions.filter(t => t.type === 'commission' && t.status === 'completed')
      .reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );

  // Gross = net payouts + commission already deducted
  const totalGross = useMemo(() => totalEarned + totalCommissionDeducted, [totalEarned, totalCommissionDeducted]);

  const totalWithdrawn = useMemo(() =>
    transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed')
      .reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );

  const pendingWithdrawal = useMemo(() =>
    transactions.filter(t => t.type === 'withdrawal' && (t.status === 'pending' || t.status === 'processing'))
      .reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );

  const totalCouponRevenue = useMemo(() =>
    coupons.reduce((s, c) => s + ((c.purchaseCount ?? 0) * Number(c.price)), 0),
    [coupons]
  );

  // Monthly earnings chart data (last 6 months from payout txns)
  const chartData = useMemo(() => {
    const monthMap = new Map<string, number>();
    transactions
      .filter(t => t.type === 'payout')
      .forEach(t => {
        const key = formatMonth(t.createdAt);
        monthMap.set(key, (monthMap.get(key) ?? 0) + Number(t.amount));
      });
    return Array.from(monthMap.entries())
      .slice(-6)
      .map(([month, earned]) => ({ month, earned: Number(earned.toFixed(2)) }));
  }, [transactions]);

  // Coupon revenue breakdown
  const couponRevenue = useMemo(() =>
    coupons
      .filter(c => Number(c.price) > 0 && (c.purchaseCount ?? 0) > 0)
      .sort((a, b) => (b.purchaseCount ?? 0) * Number(b.price) - (a.purchaseCount ?? 0) * Number(a.price))
      .slice(0, 10),
    [coupons]
  );

  const filteredTx = useMemo(() => {
    if (txFilter === 'payout') return transactions.filter(t => t.type === 'payout');
    if (txFilter === 'commission') return transactions.filter(t => t.type === 'commission');
    if (txFilter === 'withdrawal') return transactions.filter(t => t.type === 'withdrawal');
    return transactions;
  }, [transactions, txFilter]);

  // Build a commission lookup by pick reference (e.g. "pick-42") for inline display
  const commissionByRef = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter(t => t.type === 'commission' && t.reference?.startsWith('commission-'))
      .forEach(t => {
        // reference = "commission-pick-42" → base pick ref = "pick-42"
        const pickRef = t.reference!.replace(/^commission-/, '');
        map.set(pickRef, Number(t.amount));
      });
    return map;
  }, [transactions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <UnifiedHeader />
        <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl skeleton bg-[var(--card)]" />)}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">{t('earnings.title')}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">{t('earnings.subtitle')}</h1>
          <p className="text-[var(--text-muted)] mt-1">{t('earnings.track_desc_full')}</p>
        </div>

        <div className="mb-6">
          <AdSlot zoneSlug="earnings-full" fullWidth className="w-full max-w-3xl" />
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t('earnings.wallet_balance')}</p>
            <p className="text-2xl font-bold text-[var(--primary)]">
              GHS {balance !== null ? balance.toFixed(2) : '—'}
            </p>
            <Link href="/wallet" className="text-xs text-[var(--primary)] hover:underline mt-1 inline-block">{t('earnings.manage_wallet')}</Link>
          </div>

          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t('earnings.net_earned')}</p>
            <p className="text-2xl font-bold text-emerald-600">GHS {totalEarned.toFixed(2)}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{t('earnings.from_payouts', { n: String(transactions.filter(tx => tx.type === 'payout').length) })}</p>
          </div>

          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t('earnings.platform_fee')}</p>
            <p className="text-2xl font-bold text-amber-600">GHS {totalCommissionDeducted.toFixed(2)}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {totalGross > 0
                ? t('earnings.gross_pct', { pct: ((totalCommissionDeducted / totalGross) * 100).toFixed(1), gross: totalGross.toFixed(2) })
                : t('earnings.deducted_before')}
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t('earnings.withdrawn')}</p>
            <p className="text-2xl font-bold text-[var(--text)]">GHS {totalWithdrawn.toFixed(2)}</p>
            {pendingWithdrawal > 0 && (
              <p className="text-xs text-amber-600 mt-1">⏳ GHS {pendingWithdrawal.toFixed(2)} {t('earnings.pending')}</p>
            )}
          </div>
        </div>

        {/* ── Payout breakdown banner (only shown when commission exists) ── */}
        {totalCommissionDeducted > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/40 px-5 py-3.5 mb-8 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-amber-600 text-base">🏛</span>
            <div className="flex-1">
              <span className="font-semibold text-amber-800 dark:text-amber-300">{t('earnings.gross_revenue')}: GHS {totalGross.toFixed(2)}</span>
              <span className="text-amber-600 dark:text-amber-400 mx-2">−</span>
              <span className="text-amber-700 dark:text-amber-400">{t('earnings.platform_fee_label')} GHS {totalCommissionDeducted.toFixed(2)}</span>
              <span className="text-amber-600 dark:text-amber-400 mx-2">=</span>
              <span className="font-semibold text-emerald-600">{t('earnings.net_payout')} GHS {totalEarned.toFixed(2)}</span>
            </div>
            <button
              onClick={() => setTxFilter('commission')}
              className="text-xs text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-1 hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
            >
              {t('earnings.view_fee_breakdown')}
            </button>
          </div>
        )}

        {/* ── Earnings chart ── */}
        {chartData.length > 0 && (
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm mb-6">
            <h2 className="text-sm font-bold text-[var(--text)] mb-4">{t('earnings.monthly_earnings')}</h2>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip
                  formatter={((v: any) => [`GHS ${Number(v ?? 0).toFixed(2)}`, t('earnings.earned')]) as any}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                <Area type="monotone" dataKey="earned" stroke="#10b981" strokeWidth={2} fill="url(#earnGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* ── Coupon performance ── */}
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-bold text-[var(--text)]">{t('earnings.top_revenue')}</h2>
              <Link href="/my-picks" className="text-xs text-[var(--primary)] hover:underline">{t('earnings.view_all_picks')}</Link>
            </div>

            {couponRevenue.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl mb-2">🎫</p>
                <p className="text-sm text-[var(--text-muted)]">{t('earnings.no_paid_sold')}</p>
                <Link href="/create-pick" className="text-xs text-[var(--primary)] hover:underline mt-1 inline-block">{t('earnings.create_coupon_link')}</Link>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {couponRevenue.map((c) => {
                  const revenue = (c.purchaseCount ?? 0) * Number(c.price);
                  const sportIcon = c.sport ? (SPORT_META[c.sport]?.icon ?? '🌍') : '🌍';
                  return (
                    <li key={c.id}>
                      <Link href={`/coupons/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg)] transition-colors group">
                        <span className="text-lg">{sportIcon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors truncate">
                            {c.title}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {c.purchaseCount} {c.purchaseCount !== 1 ? t('earnings.purchases') : t('earnings.purchase')} × GHS {Number(c.price).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-emerald-600">GHS {revenue.toFixed(2)}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${RESULT_STYLE[c.result ?? 'pending']}`}>
                            {c.result ? t(`earnings.result_${c.result}` as 'earnings.result_won') : t('earnings.result_pending')}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Coupon stats summary ── */}
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[var(--text)]">{t('earnings.coupon_stats')}</h2>
              {reviewSummary && (
                <div className="flex items-center gap-1.5">
                  <span className="flex">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className={`text-sm ${s <= Math.round(reviewSummary.avg) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>
                    ))}
                  </span>
                  <span className="text-sm font-bold text-amber-500">{reviewSummary.avg}</span>
                  <span className="text-xs text-[var(--text-muted)]">({reviewSummary.total} {reviewSummary.total !== 1 ? t('earnings.reviews') : t('earnings.review')})</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: t('earnings.total_coupons'), value: coupons.length },
                { label: t('earnings.active'), value: coupons.filter(c => c.status === 'active' && c.result === 'pending').length },
                { label: t('earnings.won'), value: coupons.filter(c => c.result === 'won').length, color: 'text-emerald-600' },
                { label: t('earnings.lost'), value: coupons.filter(c => c.result === 'lost').length, color: 'text-red-500' },
                { label: t('earnings.free'), value: coupons.filter(c => Number(c.price) === 0).length },
                { label: t('earnings.paid'), value: coupons.filter(c => Number(c.price) > 0).length, color: 'text-amber-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl bg-[var(--bg)] border border-[var(--border)] p-3 text-center">
                  <p className={`text-xl font-bold ${color ?? 'text-[var(--text)]'}`}>{value}</p>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {coupons.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{t('earnings.win_rate')}</p>
                {(() => {
                  const settled = coupons.filter(c => c.result === 'won' || c.result === 'lost');
                  const won = coupons.filter(c => c.result === 'won').length;
                  const rate = settled.length > 0 ? (won / settled.length) * 100 : 0;
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--text-muted)]">{won}W / {settled.length - won}L</span>
                        <span className="text-sm font-bold text-emerald-600">{settled.length > 0 ? `${rate.toFixed(1)}%` : '—'}</span>
                      </div>
                      {settled.length > 0 && (
                        <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${Math.min(rate, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <Link
                href="/create-pick"
                className="flex-1 text-center py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
              >
                {t('earnings.new_coupon')}
              </Link>
              <Link
                href="/wallet"
                className="flex-1 text-center py-2 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
              >
                {t('earnings.withdraw')}
              </Link>
            </div>
          </div>
        </div>

        {/* ── Transaction history ── */}
        <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-hidden shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-bold text-[var(--text)]">{t('earnings.tx_history')}</h2>
            <div className="flex flex-wrap gap-1.5">
              {([
                { key: 'all',        label: t('earnings.filter_all') },
                { key: 'payout',     label: t('earnings.filter_payouts') },
                { key: 'commission', label: t('earnings.filter_fees') },
                { key: 'withdrawal', label: t('earnings.filter_withdrawals') },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTxFilter(key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    txFilter === key
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredTx.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm text-[var(--text-muted)]">{txFilter === 'all' ? t('earnings.no_tx_all') : t('earnings.no_tx', { type: txFilter })}</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {filteredTx.slice(0, 50).map((tx) => {
                const isCredit = ['payout', 'deposit', 'refund', 'credit'].includes(tx.type);
                const isCommission = tx.type === 'commission';
                const colorClass = TX_COLOR[tx.type] ?? 'text-[var(--text)]';
                // For payout rows, look up the commission that was deducted for the same pick
                const matchedCommission = tx.type === 'payout' && tx.reference
                  ? commissionByRef.get(tx.reference) ?? null
                  : null;
                const gross = matchedCommission !== null
                  ? Number(tx.amount) + matchedCommission
                  : null;
                return (
                  <li key={tx.id} className={`flex items-center gap-4 px-5 py-3.5 ${isCommission ? 'bg-amber-50/40 dark:bg-amber-900/5' : ''}`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base bg-[var(--bg)] border border-[var(--border)]">
                      {TX_ICON[tx.type] ?? '↔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text)] truncate">
                        {TX_TYPE_KEYS[tx.type] ? t(TX_TYPE_KEYS[tx.type]) : tx.type}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatDate(tx.createdAt)}
                        {tx.reference && <span className="ml-2 font-mono opacity-60">· {tx.reference.slice(0, 16)}</span>}
                      </p>
                      {/* Gross/fee/net breakdown for payout rows */}
                      {gross !== null && matchedCommission !== null && (
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          {t('earnings.gross_minus_fee', { gross: gross.toFixed(2), fee: matchedCommission.toFixed(2), net: Number(tx.amount).toFixed(2) })}
                        </p>
                      )}
                      {tx.description && !gross && (
                        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{tx.description}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${isCredit ? 'text-emerald-600' : isCommission ? 'text-amber-600' : colorClass}`}>
                        {isCommission ? '−' : isCredit ? '+' : '−'}GHS {Number(tx.amount).toFixed(2)}
                      </p>
                      <p className={`text-[10px] capitalize mt-0.5 ${
                        tx.status === 'completed' ? (isCommission ? 'text-amber-600' : 'text-emerald-600')
                          : tx.status === 'pending' || tx.status === 'processing' ? 'text-amber-600'
                          : tx.status === 'failed' ? 'text-red-500'
                          : 'text-[var(--text-muted)]'
                      }`}>
                        {isCommission ? t('earnings.deducted') : tx.status}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
