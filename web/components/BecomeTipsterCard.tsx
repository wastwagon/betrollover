'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { Button } from '@/components/ui/Button';

export function BecomeTipsterCard() {
  const [status, setStatus] = useState<'idle' | 'pending' | 'rejected' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/users/me/tipster-request`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((req) => setStatus(req?.status ?? 'idle'))
      .catch(() => setStatus('idle'));
  }, []);

  const requestTipster = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/users/me/request-tipster`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus(data.status === 'already_tipster' ? 'idle' : 'pending');
        alert(getApiErrorMessage(data, 'Request submitted.'));
      } else {
        alert(getApiErrorMessage(data, 'Request failed.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-card bg-[var(--card)] border border-[var(--border)] w-full min-w-0 max-w-full">
      <span className="font-display font-semibold text-[var(--text)] text-center min-w-0 px-1">Become a Tipster</span>
      <span className="text-sm text-[var(--text-muted)] mt-1 text-center min-w-0 max-w-full px-1">
        {status === 'pending' && 'Request pending. Admin will review.'}
        {status === 'rejected' && 'Request was rejected. You can try again.'}
        {(status === 'idle' || status === null) && 'Create and sell picks. Request tipster access.'}
      </span>
      {(status === 'idle' || status === 'rejected' || status === null) && (
        <Button
          type="button"
          onClick={requestTipster}
          disabled={loading}
          size="sm"
          className="mt-4 w-full max-w-xs sm:w-auto shrink-0"
        >
          {loading ? 'Submitting...' : 'Request Tipster Access'}
        </Button>
      )}
    </div>
  );
}
