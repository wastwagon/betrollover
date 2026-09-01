'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { SPORT_TAG_OPTIONS } from '@/lib/sports-content';
import { buttonClassName } from '@/components/ui/Button';
import { Input, Textarea, Field, fieldControlClassName } from '@/components/ui/Input';

const TYPES = ['article', 'strategy', 'tool'] as const;
const LANGUAGES = ['en', 'fr'] as const;

interface ResourceCategory {
  id: number;
  slug: string;
  name: string;
}

export default function AdminResourceItemEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [form, setForm] = useState({
    slug: '',
    title: '',
    excerpt: '',
    content: '',
    type: 'article' as (typeof TYPES)[number],
    sport: '',
    language: 'en' as (typeof LANGUAGES)[number],
    durationMinutes: '' as string | number,
    featured: false,
    publishedAt: '',
  });
  const [category, setCategory] = useState<ResourceCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (!id) return;
    fetch(`${getApiUrl()}/admin/resources/items/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Item not found');
        return r.json();
      })
      .then((item) => {
        setForm({
          slug: item.slug || '',
          title: item.title || '',
          excerpt: item.excerpt || '',
          content: item.content || '',
          type: (item.type || 'article') as (typeof TYPES)[number],
          sport: item.sport || '',
          language: (item.language || 'en') as (typeof LANGUAGES)[number],
          durationMinutes: item.durationMinutes ?? '',
          featured: !!item.featured,
          publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 16) : '',
        });
        setCategory(item.category || { id: item.categoryId, slug: '', name: '' });
      })
      .catch(() => setError('Item not found'))
      .finally(() => setLoading(false));
  }, [id, router]);

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
      const res = await fetch(`${getApiUrl()}/admin/resources/items/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: form.slug,
          title: form.title,
          excerpt: form.excerpt || undefined,
          content: form.content,
          type: form.type,
          sport: form.sport || null,
          language: form.language,
          durationMinutes: form.durationMinutes ? parseInt(String(form.durationMinutes), 10) : null,
          featured: form.featured,
          publishedAt: form.publishedAt || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) router.push('/admin/resources');
      else setError(getApiErrorMessage(data, 'Update failed'));
    } catch {
      setError('Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <AdminSidebar />
        <main className="admin-main-sibling section-ux-admin-main min-w-0">
          <div className="py-12 text-center text-gray-600">Loading...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <AdminSidebar />
        <main className="admin-main-sibling section-ux-admin-main min-w-0">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/admin/resources" className="text-[var(--primary)] hover:underline">← Back to Resources</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <Link href="/admin/resources" className="text-sm text-[var(--primary)] hover:underline mb-6 inline-block">
          ← Back to Resources
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Edit Resource Item</h1>
        {category && (
          <p className="text-gray-600 dark:text-gray-400 mb-6">Category: {category.name} ({category.slug})</p>
        )}
        <form onSubmit={submit} className="max-w-2xl space-y-4">
          <Input
            id="item-title"
            label="Title *"
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            onBlur={generateSlug}
            required
          />
          <Input
            id="item-slug"
            label="Slug *"
            type="text"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Type" htmlFor="item-type">
              <select
                id="item-type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as (typeof TYPES)[number] }))}
                className={fieldControlClassName()}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Sport tag" htmlFor="item-sport">
              <select
                id="item-sport"
                value={form.sport}
                onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))}
                className={fieldControlClassName()}
              >
                {SPORT_TAG_OPTIONS.map((s) => (
                  <option key={s.value || 'all'} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Language" htmlFor="item-language">
              <select
                id="item-language"
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
            id="item-excerpt"
            label="Excerpt"
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            rows={2}
          />
          <Textarea
            id="item-content"
            label="Content (HTML) *"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={10}
            required
            className="font-mono"
          />
          <Input
            id="item-duration"
            label="Duration (min read)"
            type="number"
            min={1}
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            placeholder="e.g. 5"
          />
          <Input
            id="item-published"
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
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center pt-4">
            <button
              type="submit"
              disabled={saving}
              className={buttonClassName({ className: 'w-full sm:w-auto' })}
            >
              {saving ? 'Saving...' : 'Save Changes'}
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
