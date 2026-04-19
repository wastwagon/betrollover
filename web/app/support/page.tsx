'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { useT } from '@/context/LanguageContext';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';

interface Ticket {
  id: number;
  category: string;
  subject: string;
  status: string;
  adminResponse?: string | null;
  relatedCouponId?: number | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved:    'bg-emerald-100 text-emerald-700',
  closed:      'bg-gray-100 text-gray-500',
};
const STATUS_ICON: Record<string, string> = {
  open: '📬', in_progress: '🔄', resolved: '✅', closed: '📁',
};

const CATEGORY_KEYS = ['general', 'dispute', 'settlement', 'billing', 'other'] as const;

function SupportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: 'general',
    subject: '',
    message: '',
    relatedCouponId: searchParams.get('couponId') ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchTickets = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login?redirect=/support'); return; }
    try {
      const r = await fetch(`${getApiUrl()}/support/my`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setTickets(await r.json());
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Pre-open form if coming from coupon detail
  useEffect(() => {
    if (searchParams.get('couponId') || searchParams.get('open') === '1') setShowForm(true);
  }, [searchParams]);

  const submit = async () => {
    if (!form.subject.trim() || !form.message.trim()) { setError(t('support.subject_message_required')); return; }
    setSubmitting(true); setError(null);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`${getApiUrl()}/support`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          relatedCouponId: form.relatedCouponId ? Number(form.relatedCouponId) : undefined,
        }),
      });
      if (r.ok) {
        setSuccess(true); setShowForm(false);
        setForm({ category: 'general', subject: '', message: '', relatedCouponId: '' });
        fetchTickets();
      } else {
        const d = await r.json().catch(() => ({}));
        setError(getApiErrorMessage(d, t('support.failed_submit')));
      }
    } catch { setError(t('support.network_error')); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page w-full min-w-0">
        <PageHeader
          label={t('support.help_centre')}
          title={t('support.title')}
          tagline={t('support.raise_prompt')}
          action={
            <button
              type="button"
              onClick={() => {
                setShowForm(!showForm);
                setSuccess(false);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-teal-800 text-sm font-semibold hover:bg-teal-50 transition-colors shadow-sm"
            >
              {showForm ? t('support.cancel') : t('support.new_ticket_btn')}
            </button>
          }
        />

        <div className="mb-6">
          <AdSlot zoneSlug="support-full" fullWidth className="w-full max-w-3xl" />
        </div>

        {success && (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-5 py-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">{t('support.ticket_submitted')}</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{t('support.respond_shortly')}</p>
            </div>
          </div>
        )}

        {showForm && (
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-sm mb-8">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-4">{t('support.new_support_ticket')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t('support.category')}</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{t(`support.cat_${k}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t('support.subject')}</label>
                <input
                  type="text"
                  maxLength={255}
                  placeholder={t('support.subject_placeholder')}
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t('support.message')}</label>
                <textarea
                  rows={4}
                  placeholder={t('support.message_placeholder')}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                />
              </div>
              {form.category === 'dispute' || form.category === 'settlement' ? (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t('support.related_pick_id')}</label>
                  <input
                    type="number"
                    placeholder={t('support.related_placeholder')}
                    value={form.relatedCouponId}
                    onChange={(e) => setForm((f) => ({ ...f, relatedCouponId: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              ) : null}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
              >
                {submitting ? t('support.submitting') : t('support.submit')}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="h-20 rounded-2xl bg-[var(--card)] animate-pulse" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-10 text-center">
            <p className="text-4xl mb-3">📬</p>
            <p className="font-semibold text-[var(--text)]">{t('support.no_tickets_yet')}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">{t('support.open_ticket_above')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text)] truncate">
                      {STATUS_ICON[ticket.status] ?? '📋'} {ticket.subject}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {t(`support.cat_${ticket.category}` as 'support.cat_general')}
                      {ticket.relatedCouponId && (
                        <> · <Link href={`/coupons/${ticket.relatedCouponId}`} className="text-[var(--primary)] hover:underline">{t('support.pick_id', { id: String(ticket.relatedCouponId) })}</Link></>
                      )}
                      · {new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                  <span className={`self-start sm:self-auto flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_STYLE[ticket.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
                {ticket.adminResponse && (
                  <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-800/40 p-3">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">{t('support.admin_response')}</p>
                    <p className="text-sm text-[var(--text)]">{ticket.adminResponse}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    }>
      <SupportContent />
    </Suspense>
  );
}
