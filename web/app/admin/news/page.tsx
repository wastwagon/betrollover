'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

import { getApiUrl } from '@/lib/site-config';

interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  sport?: string;
  language?: string;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export default function AdminNewsPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingInjuries, setSyncingInjuries] = useState(false);
  const [probing, setProbing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ added: number; errors: string[]; bySport?: Record<string, number> } | null>(null);
  const [injurySyncResult, setInjurySyncResult] = useState<{ added: number; errors: string[]; bySport?: Record<string, number> } | null>(null);
  const [probeResult, setProbeResult] = useState<{
    configured: boolean;
    results: Array<{
      sport: string;
      kind: string;
      label: string;
      ok: boolean;
      candidateOnly: boolean;
      resultCount: number;
      message: string;
    }>;
  } | null>(null);

  const syncTransfers = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSyncing(true);
    setSyncResult(null);
    fetch(`${getApiUrl()}/admin/news/sync-transfers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setSyncResult({ added: data.added ?? 0, errors: data.errors ?? [], bySport: data.bySport });
        if (data.added > 0) load();
      })
      .catch(() => setSyncResult({ added: 0, errors: ['Request failed'] }))
      .finally(() => setSyncing(false));
  };

  const syncInjuries = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSyncingInjuries(true);
    setInjurySyncResult(null);
    fetch(`${getApiUrl()}/admin/news/sync/injuries`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setInjurySyncResult({
          added: data.added ?? 0,
          errors: data.errors ?? [],
          bySport: data.bySport,
        });
        if (data.added > 0) load();
      })
      .catch(() => setInjurySyncResult({ added: 0, errors: ['Request failed'] }))
      .finally(() => setSyncingInjuries(false));
  };

  const probeNewsSync = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setProbing(true);
    setProbeResult(null);
    fetch(`${getApiUrl()}/admin/news/sync/probe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setProbeResult(data))
      .catch(() => setProbeResult({ configured: false, results: [] }))
      .finally(() => setProbing(false));
  };

  const load = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/admin/news`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setArticles(Array.isArray(data) ? data : []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    load();
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">News Articles</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage news across sports. Auto-sync: football transfers, football + NFL injuries. Use Probe APIs to test other sports.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={probeNewsSync}
              disabled={probing || syncing || syncingInjuries}
              className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl border border-gray-400 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {probing ? 'Probing...' : 'Probe APIs'}
            </button>
            <button
              type="button"
              onClick={syncTransfers}
              disabled={syncing || syncingInjuries || probing}
              className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl border border-[var(--primary)] text-[var(--primary)] font-semibold hover:bg-[var(--primary)]/10 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Transfers'}
            </button>
            <button
              type="button"
              onClick={syncInjuries}
              disabled={syncingInjuries || syncing || probing}
              className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl border border-amber-600 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50"
            >
              {syncingInjuries ? 'Syncing...' : 'Sync Injuries'}
            </button>
            <Link
              href="/admin/news/create"
              className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)]"
            >
              + New Article
            </Link>
          </div>
        </div>
        {syncResult && (
          <div className={`mb-6 p-4 rounded-xl ${syncResult.added > 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'}`}>
            {syncResult.added > 0 ? (
              <p>
                Added {syncResult.added} new transfer article(s) from API-Sports
                {syncResult.bySport
                  ? ` (${Object.entries(syncResult.bySport).map(([s, n]) => `${s}: ${n}`).join(', ')})`
                  : ''}.
              </p>
            ) : (
              <p>
                {syncResult.errors.length > 0
                  ? `No new transfers. ${syncResult.errors[0]}`
                  : 'No new transfers found. Ensure API_SPORTS_KEY is set in Admin → Settings.'}
              </p>
            )}
          </div>
        )}

        {injurySyncResult && (
          <div className={`mb-6 p-4 rounded-xl ${injurySyncResult.added > 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'}`}>
            {injurySyncResult.added > 0 ? (
              <p>
                Added {injurySyncResult.added} new injury article(s) from API-Sports
                {injurySyncResult.bySport
                  ? ` (${Object.entries(injurySyncResult.bySport).map(([s, n]) => `${s}: ${n}`).join(', ')})`
                  : ''}.
              </p>
            ) : (
              <p>
                {injurySyncResult.errors.length > 0
                  ? `No new injuries. ${injurySyncResult.errors[0]}`
                  : 'No new injuries found. Ensure API_SPORTS_KEY is set in Admin → Settings.'}
              </p>
            )}
          </div>
        )}

        {probeResult && (
          <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                API probe {probeResult.configured ? '(key configured)' : '(no API key)'}
              </p>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {probeResult.results.map((r) => (
                <li key={`${r.sport}-${r.kind}-${r.label}`} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.ok ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {r.ok ? 'OK' : 'No data'}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{r.label}</span>
                    {r.candidateOnly ? (
                      <span className="text-xs text-gray-500">candidate</span>
                    ) : null}
                    <span className="text-xs text-gray-500">{r.resultCount} rows</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">{r.message}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-600">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No articles yet.</p>
            <Link href="/admin/news/create" className="text-[var(--primary)] hover:underline">
              Create your first article
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Title</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Category</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Sport</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Lang</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Date</th>
                  <th className="text-right px-6 py-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-6 py-4">
                      <Link href={`/news/${a.slug}`} className="font-medium text-[var(--primary)] hover:underline" target="_blank">
                        {a.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{a.category}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{a.sport || 'football'}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{a.language || 'en'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${a.publishedAt ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {a.publishedAt ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                      {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/news/${a.id}/edit`} className="text-[var(--primary)] hover:underline text-sm">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
