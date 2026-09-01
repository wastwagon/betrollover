'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { buttonClassName } from '@/components/ui/Button';
import { Input, Textarea, Field, fieldControlClassName } from '@/components/ui/Input';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const LANGUAGES = ['en', 'fr'] as const;

export default function AdminResourceCategoryEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [form, setForm] = useState({
    slug: '',
    name: '',
    description: '',
    level: 'beginner' as (typeof LEVELS)[number],
    language: 'en' as (typeof LANGUAGES)[number],
    sortOrder: 0,
  });
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
    fetch(`${getApiUrl()}/admin/resources/categories/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(getApiErrorMessage(data, 'Category not found'));
          return null;
        }
        return data;
      })
      .then((cat) => {
        if (!cat) return;
        setForm({
          slug: cat.slug || '',
          name: cat.name || '',
          description: cat.description || '',
          level: (cat.level || 'beginner') as (typeof LEVELS)[number],
          language: (cat.language || 'en') as (typeof LANGUAGES)[number],
          sortOrder: cat.sortOrder ?? 0,
        });
      })
      .catch(() => setError('Category not found'))
      .finally(() => setLoading(false));
  }, [id, router]);

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
      const res = await fetch(`${getApiUrl()}/admin/resources/categories/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Edit Resource Category</h1>
        <form onSubmit={submit} className="max-w-2xl space-y-4">
          <Input
            id="cat-name"
            label="Name *"
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onBlur={generateSlug}
            required
          />
          <Input
            id="cat-slug"
            label="Slug *"
            type="text"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Level" htmlFor="cat-level">
              <select
                id="cat-level"
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as (typeof LEVELS)[number] }))}
                className={fieldControlClassName()}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Language" htmlFor="cat-language">
              <select
                id="cat-language"
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
            id="cat-description"
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
          />
          <Input
            id="cat-sort"
            label="Sort Order"
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
          />
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
