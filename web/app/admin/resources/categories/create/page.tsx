'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const LANGUAGES = ['en', 'fr'] as const;

export default function AdminResourceCategoryCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    slug: '',
    name: '',
    description: '',
    level: 'beginner' as (typeof LEVELS)[number],
    language: 'en' as (typeof LANGUAGES)[number],
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSlug = () => {
    const s = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm((f) => ({ ...f, slug: s }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token || !form.slug || !form.name) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/resources/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          description: form.description || undefined,
          level: form.level,
          language: form.language,
          sortOrder: form.sortOrder,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) router.push('/admin/resources');
      else setError(getApiErrorMessage(data, 'Create failed'));
    } catch {
      setError('Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <Link href="/admin/resources" className="text-sm text-[var(--primary)] hover:underline mb-6 inline-block">
          ← Back to Resources
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Resource Category</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Add a new guide category (e.g. Bankroll, Odds, Strategy).</p>
        <form onSubmit={submit} className="max-w-2xl space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={generateSlug}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as (typeof LEVELS)[number] }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
              <select
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as (typeof LANGUAGES)[number] }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l === 'en' ? 'English' : 'Français'}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
            <input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50 text-center"
            >
              {saving ? 'Creating...' : 'Create Category'}
            </button>
            <Link href="/admin/resources" className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
