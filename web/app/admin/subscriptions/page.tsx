'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl, getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';

type TabId = 'catalog' | 'purchases';

interface CatalogTipster {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  profileRoi: number | null;
  profileWinRate: number | null;
  totalPredictions: number;
  currentStreak: number;
  bestStreak: number;
  isAi?: boolean;
}

interface CatalogPackage {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  roiGuaranteeMin: number | null;
  roiGuaranteeEnabled: boolean;
}

interface CatalogItem {
  package: CatalogPackage;
  tipster: CatalogTipster | null;
  performance: {
    roi: number;
    winRate: number;
    totalPicks: number;
    wonPicks: number;
    lostPicks: number;
    totalEarnings: number;
  } | null;
}

interface AdminSubTipster {
  tipsterUserId: number;
  username: string;
  displayName: string;
  isAi: boolean;
}

interface AdminSubscriptionRow {
  id: number;
  status: string;
  startedAt: string;
  endsAt: string;
  amountPaid: number;
  createdAt: string;
  escrowStatus: string | null;
  subscriber: { id: number; username: string; displayName: string };
  package: {
    id: number;
    name: string;
    price: number;
    durationDays: number;
    roiGuaranteeMin: number | null;
    roiGuaranteeEnabled: boolean;
    tipsterUserId: number;
  };
  tipster: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isAi: boolean;
  } | null;
  /** Same settled-pick stats as VIP marketplace (per tipster). Omitted on older API responses. */
  performance?: {
    roi: number;
    winRate: number;
    totalPicks: number;
    wonPicks: number;
    lostPicks: number;
    totalEarnings: number;
  } | null;
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'active') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
  if (s === 'ended') return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
  if (s === 'cancelled') return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100';
  return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
}

function formatShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function AiHumanBadge({ isAi }: { isAi: boolean }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
        isAi
          ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200'
          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
      }`}
    >
      {isAi ? 'AI' : 'Human'}
    </span>
  );
}

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const t = useT();
  const [tab, setTab] = useState<TabId>('catalog');

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [rows, setRows] = useState<AdminSubscriptionRow[]>([]);
  const [tipsters, setTipsters] = useState<AdminSubTipster[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tipsterUserId, setTipsterUserId] = useState<string>('');
  const [tipsterKind, setTipsterKind] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingPackageId, setDeletingPackageId] = useState<number | null>(null);

  const loadCatalog = useCallback(() => {
    const apiUrl = getApiUrl();
    setCatalogLoading(true);
    fetch(`${apiUrl}/subscriptions/marketplace?limit=100`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setCatalogItems(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setCatalogItems([]))
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const loadTipsters = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/admin/subscriptions/tipsters`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTipsters(Array.isArray(data) ? data : []))
      .catch(() => setTipsters([]));
  }, []);

  const loadRows = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (tipsterUserId) params.set('tipsterUserId', tipsterUserId);
    if (tipsterKind && tipsterKind !== 'all') params.set('tipsterKind', tipsterKind);
    const q = params.toString();
    const url = `${getApiUrl()}/admin/subscriptions${q ? `?${q}` : ''}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [router, statusFilter, tipsterUserId, tipsterKind]);

  useEffect(() => {
    loadTipsters();
  }, [loadTipsters]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleDelete = async (row: AdminSubscriptionRow) => {
    const tip = row.tipster?.displayName ?? 'Tipster';
    const sub = row.subscriber.displayName;
    const kind = row.tipster?.isAi ? 'AI' : 'Human';
    if (
      !confirm(
        `Permanently delete this subscription?\n\n• Subscriber: ${sub}\n• Package: ${row.package.name}\n• Tipster (${kind}): ${tip}\n\nIf escrow is still held, the subscriber will be refunded. If payout already went to the tipster, no refund is issued. This cannot be undone.`,
      )
    ) {
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeletingId(row.id);
    try {
      const res = await fetch(`${getApiUrl()}/admin/subscriptions/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert((data as { message?: string }).message || 'Subscription removed.');
        loadRows();
      } else {
        alert((data as { message?: string }).message || 'Delete failed');
      }
    } catch {
      alert('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCatalogPackage = async (row: CatalogItem) => {
    const pkg = row.package;
    const tip = row.tipster;
    const kind = tip?.isAi ? 'AI' : 'Human';
    const tipLabel = tip?.displayName ?? 'Tipster';
    if (
      !confirm(
        `Remove this package from the VIP marketplace?\n\n• Package: ${pkg.name}\n• Tipster (${kind}): ${tipLabel}\n\nIt will be unpublished (no new subscribers). Existing subscribers keep access until their period ends. You can republish from the tipster dashboard or Admin → AI tipster packages.`,
      )
    ) {
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeletingPackageId(pkg.id);
    try {
      const res = await fetch(`${getApiUrl()}/admin/subscriptions/packages/${pkg.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert((data as { message?: string }).message || 'Package removed from marketplace.');
        loadCatalog();
      } else {
        alert((data as { message?: string }).message || 'Remove failed');
      }
    } catch {
      alert('Remove failed');
    } finally {
      setDeletingPackageId(null);
    }
  };

  const renderCatalogCard = (row: CatalogItem) => {
    const pkg = row.package;
    const tip = row.tipster;
    const perf = row.performance;
    const settled = (perf?.wonPicks ?? 0) + (perf?.lostPicks ?? 0);
    const roiDisplay = settled > 0 && perf ? `${Number(perf.roi).toFixed(1)}%` : '—';
    const wrDisplay = settled > 0 && perf ? `${Number(perf.winRate).toFixed(1)}%` : '—';
    const hasCommittedRoi = pkg.roiGuaranteeEnabled && pkg.roiGuaranteeMin != null;
    const committedRoiValue = pkg.roiGuaranteeMin != null ? `${Number(pkg.roiGuaranteeMin).toFixed(1)}%` : '—';
    const isAi = !!tip?.isAi;

    return (
      <div key={pkg.id} className="relative">
        <article className="card-gradient rounded-2xl border border-[var(--border)] shadow-lg overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-px transition-[box-shadow,transform] duration-200 ease-out">
          <button
            type="button"
            onClick={() => handleDeleteCatalogPackage(row)}
            disabled={deletingPackageId === pkg.id}
            className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-50 z-10 shadow"
            title="Remove package from VIP marketplace"
          >
            {deletingPackageId === pkg.id ? 'Removing…' : 'Delete'}
          </button>
          <div className="p-4 sm:p-5 flex flex-col flex-1">
          <div className="flex items-start gap-3 mb-3 pr-14">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-[var(--bg)] border border-[var(--border)]">
                {tip?.avatarUrl ? (
                  <Image
                    src={getAvatarUrl(tip.avatarUrl, 56)!}
                    alt=""
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                    unoptimized={shouldUnoptimizeGoogleAvatar(getAvatarUrl(tip.avatarUrl, 56))}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-[var(--primary)] bg-[var(--primary-light)]">
                    {(tip?.displayName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-[var(--text)] truncate">{tip?.displayName ?? 'Tipster'}</p>
                {tip && <AiHumanBadge isAi={isAi} />}
              </div>
              {tip?.username && <p className="text-xs text-[var(--text-muted)]">@{tip.username}</p>}
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-800/50 dark:to-emerald-900/20 border border-[var(--border)] p-3 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              {t('subscriptions.performance_heading')}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-[var(--text-muted)] text-xs block">{t('tipster.roi')}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{roiDisplay}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] text-xs block">{t('tipster.win_rate')}</span>
                <span className="font-bold text-[var(--text)]">{wrDisplay}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[var(--text-muted)] text-xs block">{t('subscriptions.picks_record')}</span>
                <span className="font-medium text-[var(--text)]">
                  {perf
                    ? `${perf.totalPicks} ${t('subscriptions.picks_total')} · ${perf.wonPicks}W-${perf.lostPicks}L`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-3 mt-auto">
            <h3 className="font-semibold text-[var(--text)] text-sm mb-1">{pkg.name}</h3>
            <p className="text-lg font-bold text-[var(--primary)]">
              GHS {Number(pkg.price).toFixed(2)} <span className="text-sm font-normal text-[var(--text-muted)]">/ {pkg.durationDays}d</span>
            </p>
            <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg-warm)]/70 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {t('subscriptions.roi_guarantee_label')}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    hasCommittedRoi
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  {hasCommittedRoi ? t('subscriptions.roi_commitment_committed') : t('subscriptions.roi_commitment_not_committed')}
                </span>
              </div>
              <p className="text-xs text-[var(--text)] mt-1">
                {hasCommittedRoi ? t('subscriptions.roi_target_delivery', { n: committedRoiValue }) : t('subscriptions.roi_target_unpublished')}
              </p>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2">
              Same listing as{' '}
              <Link href="/subscriptions/marketplace" className="text-[var(--primary)] hover:underline">
                public VIP marketplace
              </Link>
              .{isAi ? (
                <>
                  {' '}
                  <Link href="/admin/ai-tipster-packages" className="text-[var(--primary)] hover:underline">
                    Manage AI packages →
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>
        </article>
      </div>
    );
  };

  const renderPurchaseCard = (row: AdminSubscriptionRow) => {
    const pkg = row.package;
    const tip = row.tipster;
    const perf = row.performance;
    const settled = (perf?.wonPicks ?? 0) + (perf?.lostPicks ?? 0);
    const roiDisplay = settled > 0 && perf ? `${Number(perf.roi).toFixed(1)}%` : '—';
    const wrDisplay = settled > 0 && perf ? `${Number(perf.winRate).toFixed(1)}%` : '—';
    const hasCommittedRoi = pkg.roiGuaranteeEnabled && pkg.roiGuaranteeMin != null;
    const committedRoiValue = pkg.roiGuaranteeMin != null ? `${Number(pkg.roiGuaranteeMin).toFixed(1)}%` : '—';
    const isAi = tip?.isAi ?? false;

    return (
      <div key={row.id} className="relative">
        <article className="card-gradient rounded-2xl border border-[var(--border)] shadow-lg overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-px transition-[box-shadow,transform] duration-200 ease-out">
          <button
            type="button"
            onClick={() => handleDelete(row)}
            disabled={deletingId === row.id}
            className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-50 z-10 shadow"
            title="Delete subscription (refund held escrow)"
          >
            {deletingId === row.id ? 'Deleting…' : 'Delete'}
          </button>

          <div className="p-4 sm:p-5 flex flex-col flex-1">
            <div className="flex items-start gap-3 mb-3 pr-16">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-[var(--bg)] border border-[var(--border)] shrink-0 flex items-center justify-center">
                {tip?.avatarUrl ? (
                  <Image
                    src={getAvatarUrl(tip.avatarUrl, 56)!}
                    alt=""
                    width={56}
                    height={56}
                    className="object-cover w-full h-full"
                    unoptimized={shouldUnoptimizeGoogleAvatar(getAvatarUrl(tip.avatarUrl, 56))}
                  />
                ) : (
                  <span className="text-lg font-bold text-[var(--primary)]">
                    {(tip?.displayName || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[var(--text)] truncate">{tip?.displayName ?? 'Tipster'}</p>
                  {tip ? <AiHumanBadge isAi={isAi} /> : null}
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">@{tip?.username ?? '—'}</p>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-800/50 dark:to-emerald-900/20 border border-[var(--border)] p-3 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Subscriber (VIP)</p>
              <p className="text-sm font-medium text-[var(--text)]">
                {row.subscriber.displayName}{' '}
                <span className="text-[var(--text-muted)] font-normal">(@{row.subscriber.username})</span>
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Paid GHS {row.amountPaid.toFixed(2)}</p>
            </div>

            <div className="rounded-xl bg-[var(--bg-warm)]/80 border border-[var(--border)]/60 p-3 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                {t('subscriptions.performance_heading')}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[var(--text-muted)] text-xs block">{t('tipster.roi')}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{roiDisplay}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] text-xs block">{t('tipster.win_rate')}</span>
                  <span className="font-bold text-[var(--text)]">{wrDisplay}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[var(--text-muted)] text-xs block">{t('subscriptions.picks_record')}</span>
                  <span className="font-medium text-[var(--text)]">
                    {perf
                      ? `${perf.totalPicks} ${t('subscriptions.picks_total')} · ${perf.wonPicks}W-${perf.lostPicks}L`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-3 mt-auto">
              <h3 className="font-semibold text-[var(--text)] text-sm mb-1">{pkg.name}</h3>
              <p className="text-lg font-bold text-[var(--primary)]">
                GHS {pkg.price.toFixed(2)} <span className="text-sm font-normal text-[var(--text-muted)]">/ {pkg.durationDays}d</span>
              </p>
              <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg-warm)]/70 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {t('subscriptions.roi_guarantee_label')}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      hasCommittedRoi
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {hasCommittedRoi ? t('subscriptions.roi_commitment_committed') : t('subscriptions.roi_commitment_not_committed')}
                  </span>
                </div>
                <p className="text-xs text-[var(--text)] mt-1">
                  {hasCommittedRoi ? t('subscriptions.roi_target_delivery', { n: committedRoiValue }) : t('subscriptions.roi_target_unpublished')}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs mt-3">
                <span className={`px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(row.status)}`}>{row.status}</span>
                {row.escrowStatus && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-medium">
                    Escrow: {row.escrowStatus}
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--text-muted)] space-y-1 mt-2 border-t border-[var(--border)] pt-2">
                <p>
                  <span className="font-medium text-[var(--text)]">Started:</span> {formatShort(row.startedAt)}
                </p>
                <p>
                  <span className="font-medium text-[var(--text)]">Ends:</span> {formatShort(row.endsAt)}
                </p>
              </div>
            </div>

            {tip?.username && (
              <Link
                href={`/tipsters/${encodeURIComponent(tip.username)}`}
                className="mt-3 w-full text-center py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
              >
                View tipster profile
              </Link>
            )}
          </div>
        </article>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main max-w-[1600px] mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Subscription manager</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            <strong className="text-gray-800 dark:text-gray-200">Marketplace catalog</strong> mirrors the public VIP shop
            (human + AI tipsters). Use <strong className="text-gray-800 dark:text-gray-200">Delete</strong> on a card to
            unpublish that package from the shop (existing subscribers keep access until their period ends).{' '}
            <strong className="text-gray-800 dark:text-gray-200">VIP subscribers</strong> lists real checkouts — remove a
            row to revoke access (refunds held escrow like coupons).
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <Link
              href="/subscriptions/marketplace"
              className="text-sm text-[var(--primary)] hover:underline font-medium"
            >
              View VIP shop as customer →
            </Link>
            <span className="text-gray-400">·</span>
            <Link href="/admin/ai-tipster-packages" className="text-sm text-[var(--primary)] hover:underline font-medium">
              AI tipster packages →
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 w-fit">
            <button
              type="button"
              onClick={() => setTab('catalog')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === 'catalog'
                  ? 'bg-[var(--primary)] text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Marketplace catalog
            </button>
            <button
              type="button"
              onClick={() => setTab('purchases')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === 'purchases'
                  ? 'bg-[var(--primary)] text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              VIP subscribers (purchases)
            </button>
          </div>
        </div>

        {tab === 'catalog' && (
          <>
            {catalogLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
              </div>
            )}
            {!catalogLoading && catalogItems.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">No active packages on the marketplace.</p>
              </div>
            )}
            {!catalogLoading && catalogItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{catalogItems.map(renderCatalogCard)}</div>
            )}
          </>
        )}

        {tab === 'purchases' && (
          <>
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-4">
              <label className="text-sm font-medium text-amber-900 dark:text-amber-100">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">Tipster type:</label>
              <select
                value={tipsterKind}
                onChange={(e) => setTipsterKind(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All (human + AI)</option>
                <option value="human">Human tipsters only</option>
                <option value="ai">AI tipsters only</option>
              </select>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">Tipster:</label>
              <select
                value={tipsterUserId}
                onChange={(e) => setTipsterUserId(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
              >
                <option value="">All with a package</option>
                {tipsters.map((t) => (
                  <option key={t.tipsterUserId} value={String(t.tipsterUserId)}>
                    {t.isAi ? '[AI] ' : ''}
                    {t.displayName} (@{t.username})
                  </option>
                ))}
              </select>
              {tipsterUserId && (
                <button
                  type="button"
                  onClick={() => setTipsterUserId('')}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-amber-900/90 dark:text-amber-200/90 mb-4">
              Held escrow: subscriber is refunded when you delete. Released escrow: tipster was already paid; delete only removes the record.
            </p>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Loading subscriptions…</p>
                </div>
              </div>
            )}

            {!loading && rows.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-3xl">
                  ⭐
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {tipsterUserId || statusFilter !== 'all' || tipsterKind !== 'all'
                    ? 'No matching subscriptions'
                    : 'No subscriptions'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                  {tipsterUserId || statusFilter !== 'all' || tipsterKind !== 'all'
                    ? 'Nothing matches the current filters.'
                    : 'No subscription rows in the database yet. The marketplace catalog still shows published packages for sale.'}
                </p>
              </div>
            )}

            {!loading && rows.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rows.map(renderPurchaseCard)}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
