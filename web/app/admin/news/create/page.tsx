'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { NEWS_SPORT_OPTIONS } from '@/lib/sports-content';
import { buttonClassName } from '@/components/ui/Button';
import { Input, Textarea, Field, fieldControlClassName } from '@/components/ui/Input';

const CATEGORIES = ['news', 'transfer_rumour', 'confirmed_transfer', 'injury', 'gossip'] as const;
const LANGUAGES = ['en', 'fr'] as const;

export default function AdminNewsCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    slug: '',
    title: '',
    excerpt: '',
    content: '',
    category: 'news' as (typeof CATEGORIES)[number],
    sport: 'football',
    language: 'en' as (typeof LANGUAGES)[number],
    imageUrl: '',
    sourceUrl: '',
    featured: false,
    metaDescription: '',
    publishedAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSlug = () => {
    const s = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm((f) => ({ ...f, slug: s }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token || !form.slug || !form.title || !form.content) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/news`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          publishedAt: form.publishedAt || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) router.push('/admin/news');
      else setError(getApiErrorMessage(data, 'Create failed'));
    } catch {
      setError('Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <Link href="/admin/news" className="text-sm text-[var(--primary)] hover:underline mb-6 inline-block">
          ← Back to News
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Create News Article</h1>
        <form onSubmit={submit} className="max-w-2xl space-y-4">
          {error ? <p className="text-red-600 text-sm">{error}</p> : null}
          <Input
            id="news-title"
            label="Title *"
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            onBlur={generateSlug}
            required
          />
          <Input
            id="news-slug"
            label="Slug *"
            type="text"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Category" htmlFor="news-category">
              <select
                id="news-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as (typeof CATEGORIES)[number] }))}
                className={fieldControlClassName()}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace('_', ' ')}</option>
                ))}
              </select>
            </Field>
            <Field label="Sport" htmlFor="news-sport">
              <select
                id="news-sport"
                value={form.sport}
                onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))}
                className={fieldControlClassName()}
              >
                {NEWS_SPORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Language" htmlFor="news-language" hint="Same slug for French = same article, different language">
              <select
                id="news-language"
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as (typeof LANGUAGES)[number] }))}
                className={fieldControlClassName()}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l === 'en' ? 'English' : 'Français'}</option>
                ))}
              </select>
            </Field>
          </div>
          <Textarea
            id="news-excerpt"
            label="Excerpt"
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            rows={2}
          />
          <Textarea
            id="news-content"
            label="Content (HTML) *"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={10}
            required
            className="font-mono"
          />
          <Input
            id="news-image"
            label="Image URL"
            type="url"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          />
          <Input
            id="news-source"
            label="Source URL"
            type="url"
            value={form.sourceUrl}
            onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
          />
          <Input
            id="news-published"
            label="Publish Date (leave empty for draft)"
            type="datetime-local"
            value={form.publishedAt}
            onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
            />
            <label htmlFor="featured">Featured</label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center pt-4">
            <button
              type="submit"
              disabled={saving}
              className={buttonClassName({ className: 'w-full sm:w-auto' })}
            >
              {saving ? 'Saving...' : 'Create Article'}
            </button>
            <Link href="/admin/news" className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
