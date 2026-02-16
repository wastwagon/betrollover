'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppFooter } from '@/components/AppFooter';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001'}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((user) => {
        if (user.role !== 'admin') {
          router.replace('/dashboard');
          setAllowed(false);
        } else {
          setAllowed(true);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        router.replace('/login');
        setAllowed(false);
      });
  }, [router, pathname]);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <p className="text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {children}
      <AppFooter />
    </div>
  );
}
