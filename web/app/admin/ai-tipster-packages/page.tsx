'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';

type PackageStatus = 'active' | 'inactive';

interface TipsterPackage {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  status: PackageStatus;
}

interface AiPackageRow {
  tipster: {
    id: number;
    userId: number | null;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isActive: boolean;
  };
  package: TipsterPackage | null;
}

export default function AdminAiTipsterPackagesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AiPackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'on' | 'off' | 'missing'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'on_first' | 'off_first' | 'missing_first'>(
    'name_asc',
  );

  const totalTipsters = rows.length;
  const totalWithPackage = rows.filter((r) => !!r.package).length;
  const totalOn = rows.filter((r) => r.package?.status === 'active').length;
  const totalOff = rows.filter((r) => r.package?.status === 'inactive').length;
  const filteredRows = rows
    .filter((r) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        r.tipster.username.toLowerCase().includes(q) ||
        r.tipster.displayName.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (viewFilter === 'on') return r.package?.status === 'active';
      if (viewFilter === 'off') return r.package?.status === 'inactive';
      if (viewFilter === 'missing') return !r.package;
      return true;
    })
    .sort((a, b) => {
      const aName = a.tipster.displayName.toLowerCase();
      const bName = b.tipster.displayName.toLowerCase();
      const nameCmp = aName.localeCompare(bName);

      const rankBySort = (row: AiPackageRow): number => {
        if (sortBy === 'on_first') return row.package?.status === 'active' ? 0 : 1;
        if (sortBy === 'off_first') return row.package?.status === 'inactive' ? 0 : 1;
        if (sortBy === 'missing_first') return row.package ? 1 : 0;
        return 0;
      };

      if (sortBy === 'name_asc') return nameCmp;
      if (sortBy === 'name_desc') return -nameCmp;
      const rankDiff = rankBySort(a) - rankBySort(b);
      return rankDiff !== 0 ? rankDiff : nameCmp;
    });

  const loadRows = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/ai-tipsters/subscription-packages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRows([]);
        setError(getApiErrorMessage(data, 'Failed to load AI tipster packages'));
        return;
      }
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
      setError('Failed to load AI tipster packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [router]);

  const runAiSetup = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSeeding(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/setup/ai-tipsters`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(getApiErrorMessage(data, 'Failed to initialize AI tipsters/packages'));
        return;
      }
      await loadRows();
    } catch {
      setError('Failed to initialize AI tipsters/packages');
    } finally {
      setSeeding(false);
    }
  };

  const bulkSetStatus = async (status: PackageStatus) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const modeText = status === 'active' ? 'ON' : 'OFF';
    if (!confirm(`Turn ${modeText} all AI tipster packages?`)) return;
    setBulkUpdating(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/ai-tipsters/subscription-packages/bulk/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(getApiErrorMessage(data, 'Failed to update all package statuses'));
        return;
      }
      await loadRows();
    } catch {
      setError('Failed to update all package statuses');
    } finally {
      setBulkUpdating(false);
    }
  };

  const savePackage = async (pkg: TipsterPackage) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSavingId(pkg.id);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/ai-tipsters/subscription-packages/${pkg.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: pkg.name,
          price: Number(pkg.price),
          durationDays: Number(pkg.durationDays),
          status: pkg.status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(getApiErrorMessage(data, 'Failed to update package'));
        return;
      }
      const updated = data;
      setRows((prev) =>
        prev.map((r) => (r.package?.id === updated.id ? { ...r, package: { ...r.package, ...updated } } : r)),
      );
    } catch {
      setError('Failed to update package');
    } finally {
      setSavingId(null);
    }
  };

  const updateLocalPackage = (id: number, patch: Partial<TipsterPackage>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.package?.id === id
          ? {
              ...r,
              package: {
                ...r.package,
                ...patch,
              },
            }
          : r,
      ),
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Tipster Packages</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Edit each AI tipster subscription package and toggle publish on/off safely.{' '}
              <span className="text-gray-500 dark:text-gray-500">
                (Customer purchase rows after checkout are on{' '}
                <Link href="/admin/subscriptions" className="text-[var(--primary)] hover:underline font-medium">
                  VIP subscribers
                </Link>
                .)
              </span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto shrink-0">
            <button type="button"
              onClick={() => bulkSetStatus('active')}
              disabled={bulkUpdating}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium transition-colors text-center"
            >
              {bulkUpdating ? 'Applying...' : 'Turn All ON'}
            </button>
            <button type="button"
              onClick={() => bulkSetStatus('inactive')}
              disabled={bulkUpdating}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 disabled:opacity-60 text-white text-sm font-medium transition-colors text-center"
            >
              {bulkUpdating ? 'Applying...' : 'Turn All OFF'}
            </button>
            <button type="button"
              onClick={runAiSetup}
              disabled={seeding}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium transition-colors text-center"
            >
              {seeding ? 'Initializing...' : 'Initialize / Repair AI Packages'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300 px-4 py-3">
            {error}
          </div>
        )}

        {!loading && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">AI tipsters</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalTipsters}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">With package</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalWithPackage}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Published ON</p>
              <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-200">{totalOn}</p>
            </div>
            <div className="rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-700 dark:text-gray-300">Published OFF</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalOff}</p>
            </div>
          </div>
        )}

        {!loading && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <button type="button"
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewFilter === 'all'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All ({rows.length})
            </button>
            <button type="button"
              onClick={() => setViewFilter('on')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewFilter === 'on'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              ON ({totalOn})
            </button>
            <button type="button"
              onClick={() => setViewFilter('off')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewFilter === 'off'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              OFF ({totalOff})
            </button>
            <button type="button"
              onClick={() => setViewFilter('missing')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewFilter === 'missing'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Missing package ({Math.max(totalTipsters - totalWithPackage, 0)})
            </button>
          </div>
        )}

        {!loading && (
          <div className="mb-6 flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tipster by username or display name"
              className="w-full max-w-md px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as 'name_asc' | 'name_desc' | 'on_first' | 'off_first' | 'missing_first',
                )
              }
              className="px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="name_asc">Sort: Name A-Z</option>
              <option value="name_desc">Sort: Name Z-A</option>
              <option value="on_first">Sort: ON first</option>
              <option value="off_first">Sort: OFF first</option>
              <option value="missing_first">Sort: Missing package first</option>
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gradient-to-r from-red-600 to-red-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Tipster</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Package Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Publish</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRows.map((row) => (
                    <tr key={row.tipster.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{row.tipster.displayName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">@{row.tipster.username}</p>
                      </td>
                      <td className="px-6 py-4">
                        {row.package ? (
                          <input
                            value={row.package.name}
                            onChange={(e) => updateLocalPackage(row.package!.id, { name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                          />
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">No package</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.package ? (
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.package.price}
                            onChange={(e) =>
                              updateLocalPackage(row.package!.id, {
                                price: Number(e.target.value || 0),
                              })
                            }
                            className="w-28 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                          />
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.package ? (
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={row.package.durationDays}
                            onChange={(e) =>
                              updateLocalPackage(row.package!.id, {
                                durationDays: Number(e.target.value || 30),
                              })
                            }
                            className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                          />
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.package ? (
                          <select
                            value={row.package.status}
                            onChange={(e) =>
                              updateLocalPackage(row.package!.id, {
                                status: e.target.value as PackageStatus,
                              })
                            }
                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                          >
                            <option value="active">ON</option>
                            <option value="inactive">OFF</option>
                          </select>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.package ? (
                          <button type="button"
                            onClick={() => savePackage(row.package!)}
                            disabled={savingId === row.package.id}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                          >
                            {savingId === row.package.id ? 'Saving...' : 'Save'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">Run initializer</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No AI tipsters match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
