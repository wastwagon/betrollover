'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';

const API_URL = getApiUrl();

interface AuditEntry {
  id: number;
  adminId: number;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export default function AdminAuditLogPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit] = useState(100);
  const [actionFilter, setActionFilter] = useState('');

  const load = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit) });
    if (actionFilter) params.set('action', actionFilter);
    fetch(`${API_URL}/admin/audit-log?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          router.push('/login');
          return [];
        }
        return r.ok ? r.json() : [];
      })
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [limit, actionFilter, router]);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    load();
  }, [load, router]);

  const actionLabels: Record<string, string> = {
    user_role_change: 'Role change',
    user_status_change: 'Status change',
    withdrawal_status_change: 'Withdrawal status',
    content_page_update: 'Content page update',
    support_ticket_resolve: 'Support resolved',
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <AdminSidebar />
      <main className="flex-1 pl-56 pr-6 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Audit log</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Recent admin actions (user changes, withdrawals, support, content). For compliance and debugging.
          </p>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-[var(--text-muted)]">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {Object.entries(actionLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={load}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No audit entries yet.</p>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-warm)]">
                      <th className="text-left py-3 px-4 font-medium text-[var(--text-muted)]">Time</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--text-muted)]">Admin ID</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--text-muted)]">Action</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--text-muted)]">Target</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--text-muted)]">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-2.5 px-4 text-[var(--text)] whitespace-nowrap">
                          {new Date(e.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-[var(--text)]">{e.adminId}</td>
                        <td className="py-2.5 px-4 text-[var(--text)]">
                          {actionLabels[e.action] ?? e.action}
                        </td>
                        <td className="py-2.5 px-4 text-[var(--text-muted)]">
                          {e.targetType}{e.targetId ? ` #${e.targetId}` : ''}
                        </td>
                        <td className="py-2.5 px-4 text-[var(--text-muted)] max-w-xs truncate">
                          {e.details ? JSON.stringify(e.details) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
