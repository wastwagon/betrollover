'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Pick {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string | Date;
  homeScore?: number | null;
  awayScore?: number | null;
  fixtureStatus?: string | null;
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

interface PickCardProps {
  id: number;
  title: string;
  totalPicks: number;
  totalOdds: number;
  price: number;
  status?: string;
  result?: string;
  picks: Pick[];
  purchaseCount?: number;
  tipster?: Tipster | null;
  isPurchased?: boolean;
  canPurchase?: boolean;
  /** When true, shows View Details only (no purchase). Used for admin marketplace. */
  viewOnly?: boolean;
  /** When set with viewOnly, View Details links to this URL instead of opening modal. */
  detailsHref?: string;
  walletBalance?: number | null;
  onPurchase: () => void;
  purchasing?: boolean;
  showUnveil?: boolean;
  onUnveilClose?: () => void;
  className?: string;
  createdAt?: string;
}

export function PickCard({
  id,
  title,
  totalPicks,
  totalOdds,
  price,
  status,
  result,
  picks,
  purchaseCount,
  tipster,
  isPurchased = false,
  canPurchase = true,
  viewOnly = false,
  detailsHref,
  walletBalance,
  onPurchase,
  purchasing = false,
  showUnveil = false,
  onUnveilClose,
  className = '',
  createdAt,
}: PickCardProps) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUnveilModal, setShowUnveilModal] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Update unveil modal when prop changes
  useEffect(() => {
    if (showUnveil) {
      setShowUnveilModal(true);
    }
  }, [showUnveil]);

  const isFree = price === 0;
  const showFullDetails = isFree || isPurchased || viewOnly;

  const statusColors: Record<string, string> = {
    pending_approval: 'bg-amber-200 text-amber-900',
    active: 'bg-emerald-200 text-emerald-900',
    won: 'bg-emerald-200 text-emerald-900',
    lost: 'bg-red-200 text-red-900',
    cancelled: 'bg-slate-200 text-slate-700',
    void: 'bg-slate-200 text-slate-700',
  };
  const displayStatus = result && ['won', 'lost', 'void'].includes(result) ? result : status;
  const statusColor = displayStatus ? statusColors[displayStatus] || 'bg-slate-100 text-slate-600' : '';

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-white shadow-md';
    if (rank === 2) return 'bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 text-white shadow-md';
    if (rank === 3) return 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md';
    if (rank <= 10) return 'bg-gradient-to-r from-amber-200 to-yellow-300 text-amber-900';
    return 'bg-slate-200 text-slate-800';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const handlePurchase = () => {
    onPurchase();
  };

  const handleViewDetails = () => {
    if (isPurchased) {
      setShowUnveilModal(true);
    } else {
      setShowDetailsModal(true);
    }
  };

  return (
    <>
      <article
        className={`card-gradient rounded-2xl shadow-lg overflow-hidden hover:shadow-xl hover:shadow-[var(--primary)]/10 hover:-translate-y-0.5 transition-all duration-300 flex flex-col ${className}`}
      >
        <div className="p-4 flex flex-col flex-1">
          {/* Tipster Performance Header - always show when tipster data exists */}
          {(tipster || title) && (
            <div className="mb-3 pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                {tipster?.avatarUrl && !avatarError ? (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-[var(--border)]">
                    <img
                      src={tipster.avatarUrl}
                      alt={tipster.displayName}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  </div>
                ) : (
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${tipster ? getRankBadgeColor(tipster.rank) : 'bg-slate-200 text-slate-700'}`}>
                    {tipster ? (tipster.rank <= 3 ? getRankIcon(tipster.rank) : tipster.rank) : '?'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-[var(--text)] truncate" title={tipster ? `Tipster: ${tipster.displayName}` : 'Tipster'}>
                    {tipster?.displayName || 'Tipster'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {tipster ? `${tipster.totalPicks}p` : `${totalPicks}p`}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {tipster ? `${tipster.winRate.toFixed(1)}%` : '—'}
                    </span>
                    {tipster && (tipster.wonPicks > 0 || tipster.lostPicks > 0) && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {tipster.wonPicks}W / {tipster.lostPicks}L
                      </span>
                    )}
                  </div>
                </div>
                {purchaseCount !== undefined && purchaseCount > 0 && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] text-[var(--text-muted)]">{purchaseCount}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Coupon Title & Summary */}
          <div className="mb-3">
            <h2 className="font-semibold text-base text-[var(--text)] truncate mb-1">{title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">
                {totalPicks} picks • {Number(totalOdds).toFixed(2)} odds
              </span>
              {displayStatus && (
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor}`}>
                  {displayStatus.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            {createdAt && (
              <div className="mt-1">
                <span className="text-xs text-[var(--text-muted)]">
                  Created: {new Date(createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
            {price > 0 && (
              <div className="mt-2">
                <span className="text-lg font-bold text-[var(--primary)]">
                  GHS {Number(price).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Pick Details - Show for free or purchased coupons */}
          {showFullDetails && picks.length > 0 && (
            <div className="mb-3 flex-1">
              <ul className="space-y-1.5">
                {picks.slice(0, 3).map((p, i) => {
                  const matchDate = p.matchDate ? new Date(p.matchDate) : null;
                  const isStarted = matchDate ? matchDate <= new Date() : false;
                  const hasLiveScore = p.homeScore != null && p.awayScore != null;
                  const isLive = ['1H', '2H', 'HT', 'ET', 'P'].includes(p.fixtureStatus || '');
                  return (
                    <li key={i} className="flex flex-col gap-0.5 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[var(--text)] font-medium truncate flex-1 ${isStarted ? 'line-through opacity-60' : ''}`}>
                          {p.matchDescription}
                        </span>
                        <span className="text-[var(--text-muted)] flex-shrink-0 text-[10px]">
                          {p.prediction} @ {Number(p.odds || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {matchDate && (
                          <span className={`text-[10px] ${isStarted ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]'}`}>
                            {isStarted ? (isLive ? '🔴 Live' : '⏱ Started') : `⏰ ${matchDate.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}`}
                          </span>
                        )}
                        {hasLiveScore && (
                          <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded">
                            {p.homeScore} - {p.awayScore}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
                {picks.length > 3 && (
                  <li className="text-xs text-[var(--text-muted)] italic">
                    +{picks.length - 3} more picks
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Locked Message for Paid Coupons */}
          {!showFullDetails && (
            <div className="mb-3 flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div className="text-center">
                <span className="text-2xl mb-1 block">🔒</span>
                <p className="text-xs text-[var(--text-muted)]">Purchase to view details</p>
              </div>
            </div>
          )}

          {/* Action Button - purchased or viewOnly: View Details; else purchase */}
          <div className="mt-auto pt-3 border-t border-[var(--border)]">
            {isPurchased || viewOnly ? (
              detailsHref ? (
                <Link
                  href={detailsHref}
                  className="block w-full px-3 py-2.5 rounded-xl font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm text-center transition-all duration-200"
                >
                  View Details
                </Link>
              ) : (
                <button
                  onClick={handleViewDetails}
                  className="w-full px-3 py-2.5 rounded-xl font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm transition-all duration-200"
                >
                  View Details
                </button>
              )
            ) : canPurchase ? (
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="w-full px-3 py-2.5 rounded-xl font-semibold bg-[var(--accent)] hover:bg-amber-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {purchasing ? 'Processing...' : price === 0 ? 'Get Free' : 'Purchase'}
              </button>
            ) : (
              <Link
                href="/wallet"
                className="block w-full px-3 py-2 rounded-lg font-semibold bg-amber-500 hover:bg-amber-600 text-white text-sm text-center transition-colors"
              >
                Top Up Wallet
              </Link>
            )}
          </div>
        </div>
      </article>

      {/* Details Modal (Lightbox) */}
      {showDetailsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-[var(--card)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-[var(--text)]">Coupon Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {/* Tipster Info */}
              {tipster && (
                <div className="mb-6 pb-6 border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadgeColor(tipster.rank)}`}>
                      {tipster.rank <= 3 ? getRankIcon(tipster.rank) : tipster.rank}
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-[var(--text)]">{tipster.displayName}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-[var(--text-muted)]">
                          {tipster.totalPicks} picks
                        </span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {tipster.winRate.toFixed(1)}% win rate
                        </span>
                        <span className="text-sm text-[var(--text-muted)]">
                          {tipster.wonPicks}W / {tipster.lostPicks}L
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Coupon Info */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[var(--text)] mb-2">{title}</h2>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm text-[var(--text-muted)]">
                    {totalPicks} picks • {Number(totalOdds).toFixed(2)} odds
                  </span>
                  <span className={`text-lg font-bold ${price === 0 ? 'text-emerald-600' : 'text-[var(--primary)]'}`}>
                    {price === 0 ? 'Free' : `GHS ${Number(price).toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* All Picks */}
              <div>
                <h4 className="font-semibold text-[var(--text)] mb-3">All Selections</h4>
                <ul className="space-y-3">
                  {picks.map((p, i) => {
                    const hasScore = p.homeScore != null && p.awayScore != null;
                    return (
                      <li key={i} className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="flex-1 pr-4 min-w-0">
                          <span className="text-[var(--text)] font-medium block">{p.matchDescription}</span>
                          {hasScore && (
                            <span className="text-sm font-bold text-[var(--primary)] mt-1 inline-block">
                              {p.homeScore} - {p.awayScore}
                            </span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm text-[var(--text-muted)] block">{p.prediction}</span>
                          <span className="text-sm font-semibold text-[var(--primary)]">@{Number(p.odds || 0).toFixed(2)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Purchase Button in Modal */}
              {!isPurchased && (
                <div className="mt-6 pt-6 border-t border-[var(--border)]">
                  {canPurchase ? (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handlePurchase();
                      }}
                      disabled={purchasing}
                      className="w-full px-6 py-3 rounded-lg font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {purchasing ? 'Processing...' : price === 0 ? 'Get Free Coupon' : `Purchase for GHS ${Number(price).toFixed(2)}`}
                    </button>
                  ) : (
                    <Link
                      href="/wallet"
                      className="block w-full px-6 py-3 rounded-lg font-semibold bg-amber-500 hover:bg-amber-600 text-white text-center transition-colors"
                    >
                      Top Up Wallet to Purchase
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unveil Modal (After Purchase) */}
      {(showUnveilModal || showUnveil) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={() => {
            setShowUnveilModal(false);
            if (onUnveilClose) onUnveilClose();
          }}
        >
          <div
            className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto border-2 border-emerald-300 dark:border-emerald-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎉</span>
                <h3 className="text-xl font-bold">Coupon Unlocked!</h3>
              </div>
              <button
                onClick={() => {
                  setShowUnveilModal(false);
                  if (onUnveilClose) onUnveilClose();
                }}
                className="text-white hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {/* Success Message */}
              <div className="text-center mb-6">
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                  Your coupon has been unlocked!
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {price > 0 && (
                    <>Funds are held in escrow until settlement. You'll be refunded if the coupon loses.</>
                  )}
                </p>
              </div>

              {/* Coupon Details */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6">
                {tipster && (
                  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${getRankBadgeColor(tipster.rank)}`}>
                        {tipster.rank <= 3 ? getRankIcon(tipster.rank) : tipster.rank}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text)]">{tipster.displayName}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {tipster.winRate.toFixed(1)}% win rate • {tipster.totalPicks} picks
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <h2 className="text-xl font-bold text-[var(--text)] mb-3">{title}</h2>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm text-[var(--text-muted)]">
                    {totalPicks} picks • {Number(totalOdds).toFixed(2)} odds
                  </span>
                  <span className={`text-lg font-bold ${price === 0 ? 'text-emerald-600' : 'text-[var(--primary)]'}`}>
                    {price === 0 ? 'Free' : `GHS ${Number(price).toFixed(2)}`}
                  </span>
                </div>

                <div>
                  <h4 className="font-semibold text-[var(--text)] mb-3">All Selections</h4>
                  <ul className="space-y-2">
                    {picks.map((p, i) => {
                      const hasScore = p.homeScore != null && p.awayScore != null;
                      return (
                        <li key={i} className="flex justify-between items-start p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                          <div className="flex-1 pr-4 min-w-0">
                            <span className="text-sm text-[var(--text)] font-medium block">{p.matchDescription}</span>
                            {hasScore && (
                              <span className="text-xs font-bold text-[var(--primary)] mt-0.5 inline-block">
                                {p.homeScore} - {p.awayScore}
                              </span>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs text-[var(--text-muted)] block">{p.prediction}</span>
                            <span className="text-xs font-semibold text-[var(--primary)]">@{Number(p.odds || 0).toFixed(2)}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Escrow Info */}
              {price > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🔒</span>
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Funds in Escrow</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        GHS {Number(price).toFixed(2)} is held in escrow. Funds will be released to the tipster only if all selections win.
                        If any selection loses, you'll receive a full refund.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Link
                  href="/my-purchases"
                  className="flex-1 px-6 py-3 rounded-lg font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-center transition-colors"
                >
                  View in My Purchases
                </Link>
                <button
                  onClick={() => {
                    setShowUnveilModal(false);
                    if (onUnveilClose) onUnveilClose();
                  }}
                  className="px-6 py-3 rounded-lg font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </>
  );
}
