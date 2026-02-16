'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

export function BecomeTipsterCard() {
  const [status, setStatus] = useState<'idle' | 'pending' | 'rejected' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/users/me/tipster-request`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((req) => setStatus(req?.status ?? 'idle'))
      .catch(() => setStatus('idle'));
  }, []);

  const requestTipster = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/me/request-tipster`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus(data.status === 'already_tipster' ? 'idle' : 'pending');
        alert(data.message || 'Request submitted.');
      } else {
        alert(data.message || 'Request failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-card bg-[var(--card)] border border-[var(--border)]">
      <span className="text-3xl mb-3">🎯</span>
      <span className="font-semibold text-[var(--text)]">Become a Tipster</span>
      <span className="text-sm text-[var(--text-muted)] mt-1 text-center">
        {status === 'pending' && 'Request pending. Admin will review.'}
        {status === 'rejected' && 'Request was rejected. You can try again.'}
        {(status === 'idle' || status === null) && 'Create and sell picks. Request tipster access.'}
      </span>
      {(status === 'idle' || status === 'rejected' || status === null) && (
        <button
          onClick={requestTipster}
          disabled={loading}
          className="mt-4 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium text-sm disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Request Tipster Access'}
        </button>
      )}
    </div>
  );
}
