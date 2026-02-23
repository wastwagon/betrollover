'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

import { getApiUrl } from '@/lib/site-config';

interface ResourceCategory {
  id: number;
  slug: string;
  name: string;
  level: string;
  language?: string;
  items: { id: number; slug: string; title: string; type: string; publishedAt: string | null }[];
}

export default function AdminResourcesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch(`${getApiUrl()}/admin/resources/categories`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8 flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Resource Center</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage articles, strategies, and tools.</p>
          </div>
          <Link
            href="/admin/resources/categories/create"
            className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)]"
          >
            + Create Category
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-600">Loading...</div>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat.id} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {cat.name} ({cat.slug})
                    {cat.language && cat.language !== 'en' && (
                      <span className="ml-2 text-xs font-normal text-gray-500">[{cat.language}]</span>
                    )}
                  </h2>
                  <span className="flex items-center gap-3">
                    <Link
                      href={`/admin/resources/categories/${cat.id}/edit`}
                      className="text-sm text-[var(--primary)] hover:underline"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/resources/items/create?categoryId=${cat.id}`}
                      className="text-sm text-[var(--primary)] hover:underline"
                    >
                      + Add Item
                    </Link>
                  </span>
                </div>
                {cat.items?.length === 0 ? (
                  <p className="text-gray-500 text-sm">No items yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {cat.items?.map((item) => (
                      <li key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <span className="text-gray-900 dark:text-white">{item.title}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {item.type} · {item.publishedAt ? 'Published' : 'Draft'}
                          </span>
                          <Link
                            href={`/admin/resources/items/${item.id}/edit`}
                            className="text-xs text-[var(--primary)] hover:underline"
                          >
                            Edit
                          </Link>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
