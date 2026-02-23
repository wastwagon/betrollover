'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';

interface Ticket {
  id: number;
  category: string;
  subject: string;
  message: string;
  status: string;
  adminResponse?: string | null;
  relatedCouponId?: number | null;
  createdAt: string;
  user?: { id: number; displayName: string; email: string; username: string } | null;
}

interface Stats { open: number; in_progress: number; resolved: number; closed: number; total: number }

const STATUS_STYLE: Record<string, string> = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved:    'bg-emerald-100 text-emerald-700',
  closed:      'bg-gray-100 text-gray-500',
};
const CATEGORIES: Record<string, string> = {
  general:'General', dispute:'Dispute', settlement:'Settlement', billing:'Billing', other:'Other',
};

export default function AdminSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState('resolved');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success'|'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const h = { Authorization: `Bearer ${token}` };
    setLoading(true);
    try {
      const [tickRes, statRes] = await Promise.all([
        fetch(`${getApiUrl()}/support/admin/list?status=${statusFilter}&limit=50`, { headers: h }),
        fetch(`${getApiUrl()}/support/admin/stats`, { headers: h }),
      ]);
      if (tickRes.ok) { const d = await tickRes.json(); setTickets(d.items ?? []); }
      if (statRes.ok) setStats(await statRes.json());
    } finally { setLoading(false); }
  }, [router, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const resolve = async () => {
    if (!selected || !response.trim()) return;
    setSaving(true); setMsg(null);
    const token = localStorage.getItem('token');
    try {
      const r2 = await fetch(`${getApiUrl()}/support/admin/${selected.id}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: response.trim(), status: newStatus }),
      });
      if (r2.ok) {
        setMsg({ type: 'success', text: 'Ticket updated & user notified.' });
        setSelected(null); setResponse('');
        load();
      } else {
        const d = await r2.json().catch(() => ({}));
        setMsg({ type: 'error', text: d.message || 'Failed to update ticket' });
      }
    } catch { setMsg({ type: 'error', text: 'Network error' }); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Inbox</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Review and respond to user tickets.</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            {(['open','in_progress','resolved','closed','total'] as const).map((k) => (
              <div key={k} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats[k]}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">{k.replace('_',' ')}</p>
              </div>
            ))}
          </div>
        )}

        {msg && (
          <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {msg.text}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {['open','in_progress','resolved','closed'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${statusFilter === s ? 'bg-red-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-red-400'}`}>
              {s.replace('_',' ')} {stats && s in stats ? `(${stats[s as keyof Stats]})` : ''}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Ticket list */}
          <div className="space-y-3">
            {loading ? (
              [1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />)
            ) : tickets.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-gray-500">No {statusFilter.replace('_',' ')} tickets</p>
              </div>
            ) : tickets.map((t) => (
              <button key={t.id} onClick={() => { setSelected(t); setResponse(t.adminResponse ?? ''); setNewStatus(t.status === 'open' ? 'resolved' : t.status); }}
                className={`w-full text-left bg-white dark:bg-gray-800 rounded-2xl border p-4 shadow-sm hover:border-red-400 transition-colors ${selected?.id === t.id ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{t.subject}</p>
                  <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_STYLE[t.status]}`}>
                    {t.status.replace('_',' ')}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{t.user?.displayName} · {CATEGORIES[t.category] ?? t.category} · {new Date(t.createdAt).toLocaleDateString()}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{t.message}</p>
              </button>
            ))}
          </div>

          {/* Response panel */}
          {selected ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4 self-start">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">From</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selected.user?.displayName ?? 'User'}</p>
                <p className="text-xs text-gray-500">{selected.user?.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Subject</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.subject}</p>
                {selected.relatedCouponId && <p className="text-xs text-blue-500 mt-0.5">Coupon #{selected.relatedCouponId}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Message</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 rounded-lg p-3">{selected.message}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Your Response</label>
                <textarea rows={4} value={response} onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response to the user…"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <button onClick={resolve} disabled={saving || !response.trim()}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm font-semibold transition-colors">
                  {saving ? 'Sending…' : 'Send & Update'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center self-start">
              <p className="text-3xl mb-2">👈</p>
              <p className="text-gray-400 text-sm">Select a ticket to respond</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
