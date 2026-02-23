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
  const [syncResult, setSyncResult] = useState<{ added: number; errors: string[] } | null>(null);

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
        setSyncResult({ added: data.added ?? 0, errors: data.errors ?? [] });
        if (data.added > 0) load();
      })
      .catch(() => setSyncResult({ added: 0, errors: ['Request failed'] }))
      .finally(() => setSyncing(false));
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
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">News Articles</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage football news, transfers, and gossip.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={syncTransfers}
              disabled={syncing}
              className="px-5 py-2.5 rounded-xl border border-[var(--primary)] text-[var(--primary)] font-semibold hover:bg-[var(--primary)]/10 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Real Transfers'}
            </button>
            <Link
              href="/admin/news/create"
              className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)]"
            >
              + New Article
            </Link>
          </div>
        </div>
        {syncResult && (
          <div className={`mb-6 p-4 rounded-xl ${syncResult.added > 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'}`}>
            {syncResult.added > 0 ? (
              <p>Added {syncResult.added} new transfer article(s) from API-Football.</p>
            ) : (
              <p>
                {syncResult.errors.length > 0
                  ? `No new transfers. ${syncResult.errors[0]}`
                  : 'No new transfers found. Ensure API_SPORTS_KEY is set in Admin → Settings.'}
              </p>
            )}
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
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Title</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Category</th>
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
        )}
      </main>
    </div>
  );
}
