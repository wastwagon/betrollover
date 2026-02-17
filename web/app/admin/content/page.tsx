'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

interface ContentPage {
  id: number;
  slug: string;
  title: string;
  content: string;
  metaDescription: string | null;
  updatedAt: string;
}

const SLUGS = ['about', 'terms', 'privacy', 'contact'] as const;

export default function AdminContentPage() {
  const router = useRouter();
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', metaDescription: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/admin/content-pages`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPages(Array.isArray(data) ? data : []))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    load();
  }, [router]);

  const startEdit = (p: ContentPage) => {
    setEditing(p.slug);
    setForm({
      title: p.title,
      content: p.content,
      metaDescription: p.metaDescription || '',
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const save = async () => {
    if (!editing) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/content-pages/${editing}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        load();
        setEditing(null);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Content Pages</h1>
          <p className="text-gray-600 dark:text-gray-400">Edit About, Terms, Privacy, and Contact pages.</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading content pages...</p>
            </div>
          </div>
        )}
        {!loading && (
          <div className="space-y-6 max-w-4xl">
            {SLUGS.map((slug) => {
              const page = pages.find((p) => p.slug === slug);
              const isEditing = editing === slug;
              return (
                <div
                  key={slug}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{slug}</h2>
                    {!isEditing ? (
                      <button
                        onClick={() => page && startEdit(page)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={cancelEdit}
                          className="px-5 py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={save}
                          disabled={saving}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-semibold hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Title</label>
                        <input
                          type="text"
                          value={form.title}
                          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Content</label>
                        <textarea
                          value={form.content}
                          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                          rows={12}
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] font-mono text-sm"
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">Supports plain text. Line breaks preserved.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Meta Description (SEO)</label>
                        <input
                          type="text"
                          value={form.metaDescription}
                          onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--text-muted)]">
                      <p className="font-medium text-[var(--text)] mb-1">{page?.title}</p>
                      <p className="whitespace-pre-wrap line-clamp-4">{page?.content || 'No content.'}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
