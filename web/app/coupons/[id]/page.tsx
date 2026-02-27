'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { TeamBadge } from '@/components/TeamBadge';
import { getApiUrl, getAvatarUrl } from '@/lib/site-config';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Pick {
  id?: number;
  sport?: string;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  result?: string;
  matchDate?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  fixtureStatus?: string | null;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  homeCountryCode?: string | null;
  awayCountryCode?: string | null;
}

interface Tipster {
  id: number;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  winRate: number;
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  rank: number;
}

interface Coupon {
  id: number;
  title: string;
  sport?: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  purchaseCount?: number;
  status?: string;
  result?: string;
  createdAt?: string;
  picks: Pick[];
  tipster?: Tipster | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SPORT_META: Record<string, { icon: string; label: string; color: string }> = {
  Football:          { icon: '⚽', label: 'Football',          color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  Basketball:        { icon: '🏀', label: 'Basketball',        color: 'bg-orange-100 text-orange-800 border-orange-200' },
  Rugby:             { icon: '🏉', label: 'Rugby',             color: 'bg-amber-100 text-amber-800 border-amber-200' },
  MMA:               { icon: '🥊', label: 'MMA',               color: 'bg-red-100 text-red-800 border-red-200' },
  Volleyball:        { icon: '🏐', label: 'Volleyball',        color: 'bg-blue-100 text-blue-800 border-blue-200' },
  Hockey:            { icon: '🏒', label: 'Hockey',            color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  'American Football': { icon: '🏈', label: 'American Football', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  Tennis:            { icon: '🎾', label: 'Tennis',            color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'Multi-Sport':     { icon: '🌍', label: 'Multi-Sport',       color: 'bg-teal-100 text-teal-800 border-teal-200' },
};

const RESULT_STYLE: Record<string, string> = {
  won:     'bg-emerald-100 text-emerald-700 border-emerald-200',
  lost:    'bg-red-100 text-red-700 border-red-200',
  void:    'bg-gray-100 text-gray-600 border-gray-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

const RESULT_ICON: Record<string, string> = {
  won: '✓', lost: '✗', void: '—', pending: '⏳',
};

const COUPON_STATUS_STYLE: Record<string, string> = {
  won:     'bg-emerald-100 text-emerald-800 border-emerald-300',
  lost:    'bg-red-100 text-red-800 border-red-300',
  void:    'bg-gray-100 text-gray-600 border-gray-300',
  pending: 'bg-amber-50 text-amber-800 border-amber-300',
};

function formatDate(s?: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(s?: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function CouponDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <div className="h-5 w-24 rounded skeleton bg-[var(--card)]" />
            <div className="h-8 w-3/4 rounded skeleton bg-[var(--card)]" />
            <div className="h-4 w-48 rounded skeleton bg-[var(--card)]" />
            <div className="space-y-3 mt-6">
              {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl skeleton bg-[var(--card)]" />)}
            </div>
          </div>
          <div className="lg:w-72 space-y-4">
            <div className="h-52 rounded-2xl skeleton bg-[var(--card)]" />
            <div className="h-36 rounded-2xl skeleton bg-[var(--card)]" />
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Reviews Section ──────────────────────────────────────────────────────────
interface Review {
  id: number; rating: number; comment: string | null;
  createdAt: string;
  reviewer: { displayName: string; username: string } | null;
}
interface ReviewsData { avg: number; total: number; items: Review[] }

function StarRow({ rating, interactive = false, onChange }: { rating: number; interactive?: boolean; onChange?: (r: number) => void }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <button key={s} type="button"
          disabled={!interactive}
          onClick={() => onChange?.(s)}
          className={`text-lg ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} ${s <= rating ? 'text-amber-400' : 'text-gray-300'}`}
        >★</button>
      ))}
    </span>
  );
}

function ReviewsSection({ couponId, isPurchased, isSettled }: { couponId: number; isPurchased: boolean; isSettled: boolean }) {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [myReview, setMyReview] = useState<{ reviewed: boolean; review: Review | null } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    const r = await fetch(`${getApiUrl()}/reviews/coupon/${couponId}`);
    if (!r.ok) return;
    const items: Review[] = await r.json();
    const avg = items.length ? items.reduce((s, i) => s + i.rating, 0) / items.length : 0;
    setData({ avg: Number(avg.toFixed(1)), total: items.length, items });
  }, [couponId]);

  const loadMyReview = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !isPurchased) return;
    const r = await fetch(`${getApiUrl()}/reviews/coupon/${couponId}/my`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setMyReview(await r.json());
  }, [couponId, isPurchased]);

  useEffect(() => { loadReviews(); loadMyReview(); }, [loadReviews, loadMyReview]);

  const submit = async () => {
    setSubmitting(true); setErr(null);
    const token = localStorage.getItem('token');
    const r = await fetch(`${getApiUrl()}/reviews`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponId, rating, comment: comment.trim() || undefined }),
    });
    if (r.ok) { await loadReviews(); await loadMyReview(); setComment(''); }
    else { const d = await r.json().catch(() => ({})); setErr(d.message || 'Could not submit review'); }
    setSubmitting(false);
  };

  return (
    <section className="max-w-4xl mx-auto px-4 pb-10 mt-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-[var(--text)]">Buyer Reviews</h2>
        {data && data.total > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <StarRow rating={Math.round(data.avg)} />
            <span className="font-semibold text-amber-500">{data.avg}</span>
            <span>({data.total})</span>
          </span>
        )}
      </div>

      {/* Write review form — only if purchased + settled + not already reviewed */}
      {isPurchased && isSettled && myReview && !myReview.reviewed && (
        <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 mb-5 shadow-sm">
          <p className="text-sm font-semibold text-[var(--text)] mb-3">Leave a Review</p>
          <StarRow rating={rating} interactive onChange={setRating} />
          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this pick…"
            className="mt-3 w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
          />
          {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
          <button onClick={submit} disabled={submitting}
            className="mt-3 px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors">
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      )}

      {myReview?.reviewed && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 px-4 py-3 mb-4 text-sm text-emerald-700 dark:text-emerald-400">
          ✅ You reviewed this coupon — thank you!
        </div>
      )}

      {!data || data.total === 0 ? (
        <p className="text-[var(--text-muted)] text-sm">No reviews yet{isSettled ? '.' : ' — reviews unlock after the coupon settles.'}</p>
      ) : (
        <div className="space-y-3">
          {data.items.map((rev) => (
            <div key={rev.id} className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <StarRow rating={rev.rating} />
                  <span className="text-xs font-semibold text-[var(--text)]">{rev.reviewer?.displayName ?? 'Buyer'}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{new Date(rev.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'2-digit' })}</span>
              </div>
              {rev.comment && <p className="text-sm text-[var(--text-muted)] mt-1">{rev.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CouponDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push(`/login?redirect=/coupons/${id}`); return; }
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${getApiUrl()}/accumulators/${id}`, { headers })
        .then((r) => r.ok ? r.json() : null),
      fetch(`${getApiUrl()}/wallet/balance`, { headers })
        .then((r) => r.ok ? r.json() : null),
      fetch(`${getApiUrl()}/accumulators/purchased`, { headers })
        .then((r) => r.ok ? r.json() : []),
    ]).then(async ([couponData, walletData, purchased]) => {
      setCoupon(couponData);
      if (couponData) { try { (await import('@/lib/analytics')).trackEvent('coupon_viewed', { couponId: id }); } catch { /* noop */ } }
      if (walletData) setWalletBalance(Number(walletData.balance));
      if (Array.isArray(purchased)) {
        const ids = new Set(purchased.map((p: { accumulatorId?: number }) => p.accumulatorId));
        setIsPurchased(ids.has(id));
      }
    }).catch(() => setCoupon(null)).finally(() => setLoading(false));
  }, [id, router]);

  const handlePurchase = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push(`/login?redirect=/coupons/${id}`); return; }
    setPurchasing(true);
    setPurchaseError(null);
    try {
      const res = await fetch(`${getApiUrl()}/accumulators/${id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        try { (await import('@/lib/analytics')).trackEvent('coupon_purchased', { couponId: id }, token); } catch { /* noop */ }
        setIsPurchased(true);
        setPurchaseSuccess(true);
        const w = await fetch(`${getApiUrl()}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } });
        if (w.ok) { const d = await w.json(); setWalletBalance(Number(d.balance)); }
      } else {
        const err = await res.json().catch(() => ({}));
        setPurchaseError(err.message || 'Purchase failed. Please try again.');
      }
    } catch {
      setPurchaseError('Network error. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <CouponDetailSkeleton />;

  if (!coupon) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <UnifiedHeader />
        <main className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-5xl mb-4">🎫</p>
          <h1 className="text-2xl font-bold text-[var(--text)] mb-3">Coupon not found</h1>
          <p className="text-[var(--text-muted)] mb-6">This coupon may have been removed or the link is invalid.</p>
          <Link href="/coupons" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition-colors">
            ← Browse Coupons
          </Link>
        </main>
        <AppFooter />
      </div>
    );
  }

  const sportMeta = coupon.sport ? (SPORT_META[coupon.sport] ?? SPORT_META['Multi-Sport']) : null;
  const resultStyle = COUPON_STATUS_STYLE[coupon.result ?? 'pending'] ?? COUPON_STATUS_STYLE.pending;
  const wonPicks = coupon.picks.filter(p => p.result === 'won').length;
  const lostPicks = coupon.picks.filter(p => p.result === 'lost').length;
  const settledPicks = wonPicks + lostPicks;
  const canPurchase = !isPurchased && (coupon.price === 0 || (walletBalance !== null && walletBalance >= coupon.price));
  const isSettled = coupon.result === 'won' || coupon.result === 'lost';

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6 flex-wrap">
          <Link href="/coupons" className="hover:text-[var(--primary)] transition-colors">Coupons</Link>
          <span>/</span>
          <span className="text-[var(--text)] truncate max-w-[240px]">{coupon.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">

            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {sportMeta && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${sportMeta.color}`}>
                    {sportMeta.icon} {sportMeta.label}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${resultStyle}`}>
                  {coupon.result === 'pending' ? '⏳ Pending' : coupon.result === 'won' ? '✓ Won' : coupon.result === 'lost' ? '✗ Lost' : coupon.result}
                </span>
                {coupon.createdAt && (
                  <span className="text-sm text-[var(--text-muted)]">{formatDate(coupon.createdAt)}</span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] leading-tight mb-1">
                {coupon.title}
              </h1>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-[var(--text)]">{coupon.picks.length}</span> picks
                </span>
                <span className="flex items-center gap-1">
                  Total odds: <span className="font-semibold text-[var(--text)] ml-1">{Number(coupon.totalOdds).toFixed(2)}</span>
                </span>
                {settledPicks > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-emerald-600 font-semibold">{wonPicks}W</span>
                    <span className="text-red-500 font-semibold">{lostPicks}L</span>
                    <span className="text-[var(--text-muted)]">/ {coupon.picks.length} picks</span>
                  </span>
                )}
                {coupon.purchaseCount != null && coupon.purchaseCount > 0 && (
                  <span>{coupon.purchaseCount} purchase{coupon.purchaseCount !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>

            {/* Purchase success banner */}
            {purchaseSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 flex items-start gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">Coupon purchased!</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                    All picks are now revealed. They will settle automatically when matches finish.
                    Your purchase is protected by escrow — if this coupon loses, you get a refund.
                  </p>
                </div>
              </div>
            )}

            {/* Settlement result banner */}
            {isSettled && (
              <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 ${
                coupon.result === 'won'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/40'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700/40'
              }`}>
                <span className="text-2xl">{coupon.result === 'won' ? '🏆' : '❌'}</span>
                <div>
                  <p className={`font-semibold ${coupon.result === 'won' ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
                    {coupon.result === 'won' ? 'Coupon Won!' : 'Coupon Lost — Refund Processed'}
                  </p>
                  <p className={`text-sm mt-0.5 ${coupon.result === 'won' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                    {coupon.result === 'won'
                      ? 'All picks in this coupon landed. This tipster delivered.'
                      : 'This coupon has been settled. Escrow has automatically refunded all purchasers.'}
                  </p>
                </div>
              </div>
            )}

            {/* ── Picks ── */}
            <h2 className="text-base font-bold text-[var(--text)] mb-3">
              Picks ({coupon.picks.length})
            </h2>

            <div className="space-y-3 mb-8">
              {coupon.picks.map((pick, idx) => {
                const pickResult = pick.result ?? 'pending';
                const pickStyle = RESULT_STYLE[pickResult] ?? RESULT_STYLE.pending;
                const pickSport = pick.sport ? SPORT_META[
                  pick.sport.charAt(0).toUpperCase() + pick.sport.slice(1).replace('_', ' ')
                ] ?? SPORT_META[pick.sport] : null;
                const hasScore = pick.homeScore != null && pick.awayScore != null;
                const isLive = pick.fixtureStatus === 'live' || pick.fixtureStatus === '1H' || pick.fixtureStatus === '2H';

                return (
                  <div
                    key={pick.id ?? idx}
                    className={`rounded-2xl border p-4 transition-all ${
                      pickResult === 'won' ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10'
                        : pickResult === 'lost' ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10'
                        : 'border-[var(--border)] bg-[var(--card)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">

                        {/* Teams with logos */}
                        {(pick.homeTeamName || pick.matchDescription) && (
                          <div className="flex items-center gap-2 mb-2">
                            {(pick.homeTeamLogo || pick.homeCountryCode) && (
                              <TeamBadge
                                logo={pick.homeTeamLogo}
                                countryCode={pick.homeCountryCode}
                                name={pick.homeTeamName ?? ''}
                                size={22}
                              />
                            )}
                            <span className="text-sm font-semibold text-[var(--text)] truncate">
                              {pick.homeTeamName && pick.awayTeamName
                                ? `${pick.homeTeamName} vs ${pick.awayTeamName}`
                                : pick.matchDescription}
                            </span>
                            {(pick.awayTeamLogo || pick.awayCountryCode) && (
                              <TeamBadge
                                logo={pick.awayTeamLogo}
                                countryCode={pick.awayCountryCode}
                                name={pick.awayTeamName ?? ''}
                                size={22}
                              />
                            )}
                          </div>
                        )}

                        {/* Prediction */}
                        <p className="text-xs text-[var(--text-muted)] mb-1">
                          {pick.prediction}
                        </p>

                        {/* Date + live indicator */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                          {pick.matchDate && <span>{formatDateTime(pick.matchDate)}</span>}
                          {isLive && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                              🔴 LIVE
                            </span>
                          )}
                          {pickSport && coupon.sport === 'Multi-Sport' && (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${pickSport.color}`}>
                              {pickSport.icon} {pickSport.label}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {/* Odds */}
                        <span className="text-sm font-bold text-[var(--text)]">
                          {Number(pick.odds).toFixed(2)}
                        </span>

                        {/* Score */}
                        {hasScore && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]">
                            {pick.homeScore} – {pick.awayScore}
                          </span>
                        )}

                        {/* Result badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${pickStyle}`}>
                          {RESULT_ICON[pickResult]} {pickResult}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Odds breakdown */}
            <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 mb-6">
              <h3 className="text-sm font-bold text-[var(--text)] mb-3">Odds Breakdown</h3>
              <div className="space-y-2">
                {coupon.picks.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)] truncate max-w-[280px]">
                      {p.homeTeamName && p.awayTeamName
                        ? `${p.homeTeamName} vs ${p.awayTeamName}`
                        : p.matchDescription}
                    </span>
                    <span className="font-semibold text-[var(--text)] ml-4 tabular-nums">
                      {Number(p.odds).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--text)]">Total Odds</span>
                  <span className="text-lg font-bold text-[var(--primary)] tabular-nums">
                    {Number(coupon.totalOdds).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              <AdSlot zoneSlug="coupon-detail-sidebar" />

              {/* Purchase / receipt card */}
              <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-hidden shadow-sm">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-[var(--primary)]">
                      {coupon.price === 0 ? 'Free' : `GHS ${Number(coupon.price).toFixed(2)}`}
                    </span>
                    {coupon.price > 0 && walletBalance !== null && (
                      <span className="text-xs text-[var(--text-muted)]">
                        Balance: GHS {walletBalance.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {isPurchased ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40">
                        <span className="text-emerald-600 text-lg">✓</span>
                        <div>
                          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Purchased</p>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">All picks are revealed above</p>
                        </div>
                      </div>
                      <Link
                        href="/my-purchases"
                        className="block text-center text-sm text-[var(--primary)] hover:underline"
                      >
                        View in My Purchases →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {purchaseError && (
                        <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-200">{purchaseError}</p>
                      )}
                      <button
                        onClick={handlePurchase}
                        disabled={!canPurchase || purchasing}
                        className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-bold text-sm hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {purchasing ? 'Processing…' : coupon.price === 0 ? 'Get Free Coupon' : `Purchase for GHS ${Number(coupon.price).toFixed(2)}`}
                      </button>
                      {!canPurchase && !isPurchased && coupon.price > 0 && walletBalance !== null && walletBalance < coupon.price && (
                        <Link
                          href="/wallet"
                          className="block text-center text-xs text-amber-600 hover:underline"
                        >
                          ⚠ Insufficient balance — Top up wallet →
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {/* Escrow protection */}
                <div className="border-t border-[var(--border)] p-4 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">🛡</span>
                    <div>
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Escrow Protected</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed mt-0.5">
                        If this coupon loses, your purchase price is automatically refunded. No claims needed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tipster card */}
              {coupon.tipster && (
                <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Tipster</p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--primary-light)] border border-[var(--border)] flex-shrink-0">
                      {coupon.tipster.avatarUrl && !avatarError ? (
                        <Image
                          src={getAvatarUrl(coupon.tipster.avatarUrl, 40)!}
                          alt={coupon.tipster.displayName}
                          width={40} height={40}
                          className="w-full h-full object-cover"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--primary)]">
                          {coupon.tipster.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--text)] truncate">{coupon.tipster.displayName}</p>
                      <p className="text-xs text-[var(--text-muted)]">@{coupon.tipster.username}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <p className="text-base font-bold text-[var(--text)]">
                        {coupon.tipster.winRate != null ? `${Number(coupon.tipster.winRate).toFixed(0)}%` : '—'}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Win Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-[var(--text)]">{coupon.tipster.totalPicks}</p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-[var(--text)]">#{coupon.tipster.rank}</p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Rank</p>
                    </div>
                  </div>
                  <Link
                    href={`/tipsters/${coupon.tipster.username}`}
                    className="block text-center text-xs font-semibold text-[var(--primary)] hover:underline"
                  >
                    View Tipster Profile →
                  </Link>
                </div>
              )}

              {/* Share */}
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-semibold text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
              >
                {copied ? '✓ Link Copied!' : '🔗 Share Coupon'}
              </button>

              {/* Disclaimer */}
              <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-3">
                <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                  Picks are for informational purposes only. BetRollover and its tipsters accept no liability for losses incurred from acting on these picks. Refunds cover coupon purchase price only.
                </p>
              </div>

              {/* Raise a dispute / support ticket */}
              {isPurchased && (
                <a
                  href={`/support?couponId=${coupon.id}&open=1`}
                  className="block text-center text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors"
                >
                  🎫 Raise a dispute or support ticket
                </a>
              )}
            </div>
          </aside>
        </div>

        {/* ── Reviews Section ──────────────────────────────────────────── */}
        <ReviewsSection couponId={coupon.id} isPurchased={isPurchased} isSettled={coupon.result === 'won' || coupon.result === 'lost'} />

      </main>
      <AppFooter />
    </div>
  );
}
