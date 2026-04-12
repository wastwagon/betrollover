'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl, getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
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
  escrowGrossAmount?: number | null;
  escrowCommissionRateAtPurchase?: number | null;
  escrowReleasedTipsterNet?: number | null;
  escrowReleasedPlatformFee?: number | null;
  escrowReleasedCommissionRate?: number | null;
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

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return `GHS ${Number(value).toFixed(2)}`;
}

function formatDateOnly(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function escapeCsvCell(value: unknown): string {
  const raw = value == null ? '' : String(value);
  if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
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
  const REVIEWED_SESSION_KEY = 'admin.vip-subscriptions.reviewed.ids';

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [rows, setRows] = useState<AdminSubscriptionRow[]>([]);
  const [tipsters, setTipsters] = useState<AdminSubTipster[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tipsterUserId, setTipsterUserId] = useState<string>('');
  const [tipsterKind, setTipsterKind] = useState<string>('all');
  const [createdFrom, setCreatedFrom] = useState<string>('');
  const [createdTo, setCreatedTo] = useState<string>('');
  const [showOnlyEndedHeld, setShowOnlyEndedHeld] = useState(false);
  const [showOnlyMissingSnapshots, setShowOnlyMissingSnapshots] = useState(false);
  const [reconcileMode, setReconcileMode] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<number[]>([]);
  const [hideReviewed, setHideReviewed] = useState(false);
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
    if (createdFrom) params.set('createdFrom', createdFrom);
    if (createdTo) params.set('createdTo', createdTo);
    const q = params.toString();
    const url = `${getApiUrl()}/admin/subscriptions${q ? `?${q}` : ''}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [router, statusFilter, tipsterUserId, tipsterKind, createdFrom, createdTo]);

  useEffect(() => {
    loadTipsters();
  }, [loadTipsters]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (reconcileMode && statusFilter !== 'ended') {
      setStatusFilter('ended');
    }
  }, [reconcileMode, statusFilter]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(REVIEWED_SESSION_KEY);
      if (!raw) return;
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) {
        const valid = ids
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v) && v > 0)
          .map((v) => Math.trunc(v));
        setReviewedIds([...new Set(valid)]);
      }
    } catch {
      // ignore malformed session cache
    }
  }, [REVIEWED_SESSION_KEY]);

  useEffect(() => {
    sessionStorage.setItem(REVIEWED_SESSION_KEY, JSON.stringify(reviewedIds));
  }, [REVIEWED_SESSION_KEY, reviewedIds]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (reconcileMode) {
      out = out.filter((r) => r.status === 'ended');
    }
    if (showOnlyEndedHeld) {
      out = out.filter((r) => r.status === 'ended' && r.escrowStatus === 'held');
    }
    if (showOnlyMissingSnapshots) {
      out = out.filter(
        (r) =>
          r.status === 'ended' &&
          r.escrowStatus === 'released' &&
          (r.escrowReleasedTipsterNet == null || r.escrowReleasedPlatformFee == null),
      );
    }
    if (hideReviewed) {
      const reviewed = new Set(reviewedIds);
      out = out.filter((r) => !reviewed.has(r.id));
    }
    if (reconcileMode) {
      out = [...out].sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        const va = Number.isNaN(da) ? Number.MAX_SAFE_INTEGER : da;
        const vb = Number.isNaN(db) ? Number.MAX_SAFE_INTEGER : db;
        return va - vb;
      });
    }
    return out;
  }, [rows, showOnlyEndedHeld, showOnlyMissingSnapshots, reconcileMode, hideReviewed, reviewedIds]);

  const handleExportCsv = useCallback(() => {
    const sourceRows = filteredRows;
    if (sourceRows.length === 0) return;
    const headers = [
      'subscriptionId',
      'status',
      'createdAt',
      'startedAt',
      'endsAt',
      'subscriberId',
      'subscriberUsername',
      'subscriberDisplayName',
      'tipsterUserId',
      'tipsterUsername',
      'tipsterDisplayName',
      'tipsterType',
      'packageId',
      'packageName',
      'packageDurationDays',
      'amountPaid',
      'escrowStatus',
      'escrowGrossAmount',
      'escrowCommissionRateAtPurchase',
      'escrowReleasedTipsterNet',
      'escrowReleasedPlatformFee',
      'escrowReleasedCommissionRate',
    ];
    const dataLines = sourceRows.map((row) =>
      [
        row.id,
        row.status,
        row.createdAt,
        row.startedAt,
        row.endsAt,
        row.subscriber.id,
        row.subscriber.username,
        row.subscriber.displayName,
        row.package.tipsterUserId,
        row.tipster?.username ?? '',
        row.tipster?.displayName ?? '',
        row.tipster?.isAi ? 'ai' : 'human',
        row.package.id,
        row.package.name,
        row.package.durationDays,
        row.amountPaid,
        row.escrowStatus ?? '',
        row.escrowGrossAmount ?? '',
        row.escrowCommissionRateAtPurchase ?? '',
        row.escrowReleasedTipsterNet ?? '',
        row.escrowReleasedPlatformFee ?? '',
        row.escrowReleasedCommissionRate ?? '',
      ]
        .map(escapeCsvCell)
        .join(','),
    );
    const csv = [headers.join(','), ...dataLines].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateTag = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vip-subscribers-${dateTag}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredRows]);

  const totals = useMemo(() => {
    const count = filteredRows.length;
    const gross = filteredRows.reduce((sum, r) => sum + Number(r.escrowGrossAmount ?? r.amountPaid ?? 0), 0);
    const releasedNet = filteredRows.reduce((sum, r) => sum + Number(r.escrowReleasedTipsterNet ?? 0), 0);
    const platformFee = filteredRows.reduce((sum, r) => sum + Number(r.escrowReleasedPlatformFee ?? 0), 0);
    const heldCount = filteredRows.filter((r) => r.escrowStatus === 'held').length;
    const releasedCount = filteredRows.filter((r) => r.escrowStatus === 'released').length;
    const refundedCount = filteredRows.filter((r) => r.escrowStatus === 'refunded').length;
    return {
      count,
      gross: Number(gross.toFixed(2)),
      releasedNet: Number(releasedNet.toFixed(2)),
      platformFee: Number(platformFee.toFixed(2)),
      heldCount,
      releasedCount,
      refundedCount,
    };
  }, [filteredRows]);

  const unreleasedGross = Number((totals.gross - totals.releasedNet - totals.platformFee).toFixed(2));
  const endedWithHeld = rows.filter((r) => r.status === 'ended' && r.escrowStatus === 'held').length;
  const endedWithMissingReleasedValues = rows.filter(
    (r) =>
      r.status === 'ended' &&
      r.escrowStatus === 'released' &&
      (r.escrowReleasedTipsterNet == null || r.escrowReleasedPlatformFee == null),
  ).length;

  const toggleReviewed = useCallback((id: number) => {
    setReviewedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }, []);

  const nextUnresolved = useMemo(() => {
    const reviewed = new Set(reviewedIds);
    return filteredRows.find((r) => {
      if (reviewed.has(r.id)) return false;
      const endedHeld = r.status === 'ended' && r.escrowStatus === 'held';
      const missingSnapshot =
        r.status === 'ended' &&
        r.escrowStatus === 'released' &&
        (r.escrowReleasedTipsterNet == null || r.escrowReleasedPlatformFee == null);
      return endedHeld || missingSnapshot;
    });
  }, [filteredRows, reviewedIds]);

  const jumpToNextUnresolved = useCallback(() => {
    if (!nextUnresolved) return;
    const el = document.getElementById(`sub-card-${nextUnresolved.id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-amber-400');
    window.setTimeout(() => {
      el.classList.remove('ring-2', 'ring-amber-400');
    }, 1800);
  }, [nextUnresolved]);

  const jumpToNextUnresolvedAfter = useCallback(
    (currentId: number) => {
      const reviewed = new Set(reviewedIds);
      reviewed.add(currentId);
      const next = filteredRows.find((r) => {
        if (r.id === currentId) return false;
        if (reviewed.has(r.id)) return false;
        const endedHeld = r.status === 'ended' && r.escrowStatus === 'held';
        const missingSnapshot =
          r.status === 'ended' &&
          r.escrowStatus === 'released' &&
          (r.escrowReleasedTipsterNet == null || r.escrowReleasedPlatformFee == null);
        return endedHeld || missingSnapshot;
      });
      if (!next) return;
      const el = document.getElementById(`sub-card-${next.id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-amber-400');
      window.setTimeout(() => {
        el.classList.remove('ring-2', 'ring-amber-400');
      }, 1800);
    },
    [filteredRows, reviewedIds],
  );

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
        alert(getApiErrorMessage(data, 'Subscription removed.'));
        loadRows();
      } else {
        alert(getApiErrorMessage(data, 'Delete failed'));
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
        alert(getApiErrorMessage(data, 'Package removed from marketplace.'));
        loadCatalog();
      } else {
        alert(getApiErrorMessage(data, 'Remove failed'));
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-[var(--text-muted)] text-xs block">{t('tipster.roi')}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{roiDisplay}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] text-xs block">{t('tipster.win_rate')}</span>
                <span className="font-bold text-[var(--text)]">{wrDisplay}</span>
              </div>
              <div className="sm:col-span-2">
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
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] min-w-0">
                  {t('subscriptions.roi_guarantee_label')}
                </span>
                <span
                  className={`self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
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
    const isReviewed = reviewedIds.includes(row.id);

    return (
      <div id={`sub-card-${row.id}`} key={row.id} className="relative">
        <article
          className={`card-gradient rounded-2xl border shadow-lg overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-px transition-[box-shadow,transform] duration-200 ease-out ${
            isReviewed ? 'border-emerald-300/80 dark:border-emerald-700 opacity-90' : 'border-[var(--border)]'
          }`}
        >
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

            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50/40 dark:from-blue-900/20 dark:to-cyan-900/10 border border-[var(--border)] p-3 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Escrow breakdown
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[var(--text-muted)] text-xs block">Gross</span>
                  <span className="font-semibold text-[var(--text)]">{formatMoney(row.escrowGrossAmount)}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] text-xs block">Rate at purchase</span>
                  <span className="font-semibold text-[var(--text)]">
                    {row.escrowCommissionRateAtPurchase != null
                      ? `${Number(row.escrowCommissionRateAtPurchase).toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] text-xs block">Tipster net (released)</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(row.escrowReleasedTipsterNet)}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] text-xs block">Platform fee (released)</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    {formatMoney(row.escrowReleasedPlatformFee)}
                  </span>
                </div>
              </div>
              {row.escrowStatus === 'held' ? (
                <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                  Held escrow has projected split only; final values are written when period-end settlement releases.
                </p>
              ) : row.escrowStatus === 'released' ? (
                <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                  Released rate:{' '}
                  {row.escrowReleasedCommissionRate != null
                    ? `${Number(row.escrowReleasedCommissionRate).toFixed(2)}%`
                    : '—'}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl bg-[var(--bg-warm)]/80 border border-[var(--border)]/60 p-3 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                {t('subscriptions.performance_heading')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[var(--text-muted)] text-xs block">{t('tipster.roi')}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{roiDisplay}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] text-xs block">{t('tipster.win_rate')}</span>
                  <span className="font-bold text-[var(--text)]">{wrDisplay}</span>
                </div>
                <div className="sm:col-span-2">
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
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] min-w-0">
                    {t('subscriptions.roi_guarantee_label')}
                  </span>
                  <span
                    className={`self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
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
                {isReviewed && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 font-medium">
                    Reviewed
                  </span>
                )}
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
            <button
              type="button"
              onClick={() => toggleReviewed(row.id)}
              className={`mt-2 w-full text-center py-2 rounded-lg text-sm font-semibold border ${
                isReviewed
                  ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {isReviewed ? 'Unmark reviewed' : 'Mark reviewed'}
            </button>
            {!isReviewed && (
              <button
                type="button"
                onClick={() => {
                  toggleReviewed(row.id);
                  window.setTimeout(() => jumpToNextUnresolvedAfter(row.id), 0);
                }}
                className="mt-2 w-full text-center py-2 rounded-lg text-sm font-semibold border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                Mark reviewed + next
              </button>
            )}
          </div>
        </article>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main max-w-[1600px] mx-auto w-full min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Subscription manager</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            <strong className="text-gray-800 dark:text-gray-200">Marketplace catalog</strong> mirrors the public VIP shop
            (human + AI tipsters). Use <strong className="text-gray-800 dark:text-gray-200">Delete</strong> on a card to
            unpublish that package from the shop (existing subscribers keep access until their period ends).{' '}
            <strong className="text-gray-800 dark:text-gray-200">VIP subscribers</strong> lists real checkouts — remove a
            row to revoke access (refunds held escrow like picks).
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

          <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setTab('catalog')}
              className={`flex-1 min-w-0 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
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
              className={`flex-1 min-w-0 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">Created from:</label>
              <input
                type="date"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
              />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">to:</label>
              <input
                type="date"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
              />
              {(createdFrom || createdTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setCreatedFrom('');
                    setCreatedTo('');
                  }}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                >
                  Clear dates
                </button>
              )}
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={loading || filteredRows.length === 0}
                className="ml-auto inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-3 py-2"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => setHideReviewed((v) => !v)}
                className={`inline-flex items-center rounded-lg text-sm font-semibold px-3 py-2 border ${
                  hideReviewed
                    ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-700 dark:border-slate-700'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {hideReviewed ? 'Showing unreviewed only' : 'Hide reviewed'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReconcileMode((v) => !v);
                  if (reconcileMode) {
                    setShowOnlyEndedHeld(false);
                    setShowOnlyMissingSnapshots(false);
                  }
                }}
                className={`inline-flex items-center rounded-lg text-sm font-semibold px-3 py-2 border ${
                  reconcileMode
                    ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {reconcileMode ? 'Reconcile mode: on' : 'Reconcile mode'}
              </button>
              {reviewedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewedIds([])}
                  className="inline-flex items-center rounded-lg text-sm font-semibold px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Clear reviewed ({reviewedIds.length})
                </button>
              )}
              <button
                type="button"
                onClick={jumpToNextUnresolved}
                disabled={!nextUnresolved}
                className="inline-flex items-center rounded-lg text-sm font-semibold px-3 py-2 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Jump to next unreviewed anomaly"
              >
                Next unresolved
              </button>
            </div>
            <p className="text-xs text-amber-900/90 dark:text-amber-200/90 mb-4">
              Held escrow: subscriber is refunded when you delete. Released escrow: tipster was already paid; delete only removes the record.
            </p>
            {(statusFilter !== 'all' || tipsterKind !== 'all' || tipsterUserId || createdFrom || createdTo || reconcileMode) && (
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mr-1 self-center">
                  Active filters:
                </span>
                {reconcileMode && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 text-xs font-medium">
                    Reconcile mode (ended + oldest first)
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-xs font-medium">
                    Status: {statusFilter}
                  </span>
                )}
                {tipsterKind !== 'all' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200 text-xs font-medium">
                    Type: {tipsterKind}
                  </span>
                )}
                {tipsterUserId && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 text-xs font-medium">
                    Tipster: {tipsters.find((x) => String(x.tipsterUserId) === tipsterUserId)?.displayName ?? `#${tipsterUserId}`}
                  </span>
                )}
                {(createdFrom || createdTo) && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 text-xs font-medium">
                    Date: {createdFrom ? formatDateOnly(createdFrom) : 'Any'} to {createdTo ? formatDateOnly(createdTo) : 'Any'}
                  </span>
                )}
              </div>
            )}
            {!loading && rows.length > 0 && (
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2">
                <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-gray-800 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Rows</p>
                  <p className="text-sm font-semibold text-[var(--text)]">{totals.count}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-gray-800 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Escrow gross</p>
                  <p className="text-sm font-semibold text-[var(--text)]">{formatMoney(totals.gross)}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-gray-800 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Released tipster net</p>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatMoney(totals.releasedNet)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-gray-800 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Released platform fee</p>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {formatMoney(totals.platformFee)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-gray-800 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Escrow statuses</p>
                  <p className="text-xs font-medium text-[var(--text)]">
                    held {totals.heldCount} · released {totals.releasedCount} · refunded {totals.refundedCount}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-gray-800 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Unreleased gross</p>
                  <p
                    className={`text-sm font-semibold ${
                      unreleasedGross > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-[var(--text)]'
                    }`}
                  >
                    {formatMoney(unreleasedGross)}
                  </p>
                  {unreleasedGross > 0 ? (
                    <p className="text-[10px] mt-1 text-amber-700 dark:text-amber-300">
                      Non-zero balance still not released/refunded in current scope.
                    </p>
                  ) : null}
                </div>
              </div>
            )}
            {!loading && (endedWithHeld > 0 || endedWithMissingReleasedValues > 0) && (
              <div className="mb-4 rounded-xl border border-amber-300/80 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Settlement warnings</p>
                {endedWithHeld > 0 ? (
                  <p className="text-xs text-amber-900/90 dark:text-amber-200 mt-1">
                    {endedWithHeld} ended subscription{endedWithHeld !== 1 ? 's' : ''} still show held escrow.
                    <button
                      type="button"
                      onClick={() => {
                        setShowOnlyEndedHeld(true);
                        setShowOnlyMissingSnapshots(false);
                        setStatusFilter('all');
                      }}
                      className="ml-2 underline font-semibold hover:no-underline"
                    >
                      Show only these
                    </button>
                  </p>
                ) : null}
                {endedWithMissingReleasedValues > 0 ? (
                  <p className="text-xs text-amber-900/90 dark:text-amber-200 mt-1">
                    {endedWithMissingReleasedValues} ended/released subscription{endedWithMissingReleasedValues !== 1 ? 's' : ''} missing released net/fee snapshots.
                    <button
                      type="button"
                      onClick={() => {
                        setShowOnlyEndedHeld(false);
                        setShowOnlyMissingSnapshots(true);
                        setStatusFilter('all');
                      }}
                      className="ml-2 underline font-semibold hover:no-underline"
                    >
                      Show only these
                    </button>
                  </p>
                ) : null}
                {(showOnlyEndedHeld || showOnlyMissingSnapshots) && (
                  <p className="text-xs text-amber-900/90 dark:text-amber-200 mt-2">
                    Quick warning filter active.
                    <button
                      type="button"
                      onClick={() => {
                        setShowOnlyEndedHeld(false);
                        setShowOnlyMissingSnapshots(false);
                      }}
                      className="ml-2 underline font-semibold hover:no-underline"
                    >
                      Clear quick filter
                    </button>
                  </p>
                )}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Loading subscriptions…</p>
                </div>
              </div>
            )}

            {!loading && filteredRows.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-3xl">
                  ⭐
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {tipsterUserId || statusFilter !== 'all' || tipsterKind !== 'all' || createdFrom || createdTo || showOnlyEndedHeld || showOnlyMissingSnapshots
                    ? 'No matching subscriptions'
                    : 'No subscriptions'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                  {tipsterUserId || statusFilter !== 'all' || tipsterKind !== 'all' || createdFrom || createdTo || showOnlyEndedHeld || showOnlyMissingSnapshots
                    ? 'Nothing matches the current filters.'
                    : 'No subscription rows in the database yet. The marketplace catalog still shows published packages for sale.'}
                </p>
              </div>
            )}

            {!loading && filteredRows.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredRows.map(renderPurchaseCard)}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
