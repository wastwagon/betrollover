'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch(`${API_URL}/notifications?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [router]);

  const markRead = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <PageHeader
            label="Notifications"
            title="Notifications"
            tagline="Your latest activity and updates"
          />

          {items.length === 0 ? (
            <div className="card-gradient rounded-2xl p-8 text-center">
              <p className="text-sm text-[var(--text-muted)]">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
            {items.map((n) => (
              <div
                key={n.id}
                className={`card-gradient rounded-2xl p-3 transition-all duration-300 hover:shadow-lg ${
                  !n.isRead ? 'border-l-4 border-l-[var(--primary)] shadow-[var(--primary)]/5' : ''
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text)]">{n.title}</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{n.message}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="text-xs font-medium text-[var(--primary)] shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </AppShell>
  );
}
