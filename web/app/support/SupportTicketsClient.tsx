'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { loginRedirectUrl } from '@/lib/login-redirect-path';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, fieldControlClassName } from '@/components/ui/Input';

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
  open: 'bg-[var(--primary-light)] text-[var(--primary)]',
  in_progress: 'bg-[var(--accent-light)] text-[var(--accent)]',
  resolved: 'bg-[var(--success-light)] text-[var(--success)]',
  closed: 'bg-[var(--fill-secondary)] text-[var(--text-muted)]',
};

const CATEGORY_KEYS = ['general', 'dispute', 'settlement', 'billing', 'other'] as const;

function SupportTicketsInner() {
  const searchParams = useSearchParams();
  const t = useT();

  const [authed, setAuthed] = useState(false);
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    setAuthed(true);
    try {
      const r = await fetch(`${getApiUrl()}/support/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setTickets(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (searchParams.get('couponId') || searchParams.get('open') === '1') setShowForm(true);
  }, [searchParams]);

  const submit = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      setError(t('support.subject_message_required'));
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = loginRedirectUrl('/support?open=1');
      return;
    }
    setSubmitting(true);
    setError(null);
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
        setSuccess(true);
        setShowForm(false);
        setForm({ category: 'general', subject: '', message: '', relatedCouponId: '' });
        void fetchTickets();
      } else {
        const d = await r.json().catch(() => ({}));
        setError(getApiErrorMessage(d, t('support.failed_submit')));
      }
    } catch {
      setError(t('support.network_error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!authed && !loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 max-w-3xl">
        <h2 className="text-base font-semibold text-[var(--text)]">{t('support.tickets_sign_in_h')}</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('support.tickets_sign_in_body')}</p>
        <p className="mt-4">
          <Link
            href={loginRedirectUrl('/support')}
            className="font-semibold text-[var(--primary)] hover:underline"
          >
            {t('support.tickets_sign_in_cta')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--text)]">{t('support.your_tickets_h')}</h2>
        <Button
          type="button"
          variant={showForm ? 'secondary' : 'primary'}
          className="w-full sm:w-auto"
          onClick={() => {
            setShowForm(!showForm);
            setSuccess(false);
          }}
        >
          {showForm ? t('support.cancel') : t('support.new_ticket_btn')}
        </Button>
      </div>

      {success ? (
        <div className="rounded-2xl bg-[var(--success-light)] border border-[var(--success)]/25 px-5 py-4 mb-6">
          <p className="font-semibold text-[var(--success)]">{t('support.ticket_submitted')}</p>
          <p className="text-sm text-[var(--success)] opacity-90">{t('support.respond_shortly')}</p>
        </div>
      ) : null}

      {showForm ? (
        <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-sm mb-8">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-4">{t('support.new_support_ticket')}</h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5 min-w-0 w-full">
              <label htmlFor="support-category" className="text-xs font-medium text-[var(--text-muted)]">
                {t('support.category')}
              </label>
              <select
                id="support-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={fieldControlClassName()}
              >
                {CATEGORY_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {t(`support.cat_${k}`)}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t('support.subject')}
              type="text"
              maxLength={255}
              placeholder={t('support.subject_placeholder')}
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
            <Textarea
              label={t('support.message')}
              rows={4}
              placeholder={t('support.message_placeholder')}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
            {form.category === 'dispute' || form.category === 'settlement' ? (
              <Input
                label={t('support.related_pick_id')}
                type="number"
                placeholder={t('support.related_placeholder')}
                value={form.relatedCouponId}
                onChange={(e) => setForm((f) => ({ ...f, relatedCouponId: e.target.value }))}
              />
            ) : null}
            {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
            <Button type="button" onClick={() => void submit()} disabled={submitting} fullWidth>
              {submitting ? t('support.submitting') : t('support.submit')}
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--card)] animate-pulse" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-10 text-center">
          <p className="font-display font-semibold text-[var(--text)]">{t('support.no_tickets_yet')}</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">{t('support.open_ticket_above')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text)] truncate">{ticket.subject}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {t(`support.cat_${ticket.category}` as 'support.cat_general')}
                    {ticket.relatedCouponId ? (
                      <>
                        {' '}
                        ·{' '}
                        <Link
                          href={`/coupons/${ticket.relatedCouponId}`}
                          className="text-[var(--primary)] hover:underline"
                        >
                          {t('support.pick_id', { id: String(ticket.relatedCouponId) })}
                        </Link>
                      </>
                    ) : null}
                    ·{' '}
                    {new Date(ticket.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </p>
                </div>
                <span
                  className={`self-start sm:self-auto flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_STYLE[ticket.status] ?? 'bg-[var(--fill-secondary)] text-[var(--text-muted)]'}`}
                >
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
              {ticket.adminResponse ? (
                <div className="mt-3 rounded-xl bg-[var(--primary-light)] border border-[var(--primary)]/20 p-3">
                  <p className="text-xs font-semibold text-[var(--primary)] mb-1">{t('support.admin_response')}</p>
                  <p className="text-sm text-[var(--text)]">{ticket.adminResponse}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SupportTicketsClient() {
  return (
    <Suspense
      fallback={
        <div className="h-24 max-w-3xl rounded-2xl bg-[var(--card)] animate-pulse" aria-hidden />
      }
    >
      <SupportTicketsInner />
    </Suspense>
  );
}
