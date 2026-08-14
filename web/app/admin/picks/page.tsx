'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

export default function AdminPicksPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/marketplace');
  }, [router]);

  return (
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Redirecting to Marketplace…</p>
          <Link href="/admin/marketplace" className="text-[var(--primary)] hover:underline font-medium">
            Go to Marketplace →
          </Link>
        </div>
      </main>
    </div>
  );
}
