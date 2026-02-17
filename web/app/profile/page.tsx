'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

interface Profile {
  id: number;
  email: string;
  username: string;
  displayName: string;
  phone: string | null;
  role: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setProfile(data);
        setDisplayName(data.displayName || '');
        setPhone(data.phone || '');
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName, phone: phone || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setProfile((p) => (p ? { ...p, displayName, phone: phone || null } : null));
        setMsg('Profile updated.');
      } else {
        setMsg(data.message || 'Update failed.');
      }
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwNew !== pwConfirm) {
      setPwMsg('New passwords do not match.');
      return;
    }
    if (pwNew.length < 6) {
      setPwMsg('Password must be at least 6 characters.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    setPwSaving(true);
    setPwMsg('');
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: pwCurrent,
          newPassword: pwNew,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPwCurrent('');
        setPwNew('');
        setPwConfirm('');
        setPwMsg('Password updated.');
      } else {
        setPwMsg(data.message || 'Change failed.');
      }
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <PageHeader
            label="Profile"
            title="Profile"
            tagline="Your account and preferences"
          />

          <div className="space-y-4">
            <form onSubmit={saveProfile} className="card-gradient rounded-2xl p-5 shadow-lg animate-fade-in-up animate-delay-100">
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Account</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-0.5">Email</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">Email cannot be changed.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-0.5">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-0.5">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]"
                />
              </div>
              {msg && <p className="text-sm text-[var(--primary)]">{msg}</p>}
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white hover:shadow-lg hover:shadow-[var(--primary)]/30 disabled:opacity-50 transition-all duration-200"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>

          <form onSubmit={changePassword} className="card-gradient rounded-2xl p-5 shadow-lg animate-fade-in-up animate-delay-200">
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Change Password</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-0.5">Current Password</label>
                <input
                  type="password"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-0.5">New Password</label>
                <input
                  type="password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-0.5">Confirm New Password</label>
                <input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]"
                />
              </div>
              {pwMsg && <p className={`text-sm ${pwMsg.startsWith('Password updated') ? 'text-green-600' : 'text-red-600'}`}>{pwMsg}</p>}
              <button
                type="submit"
                disabled={pwSaving}
                className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white hover:shadow-lg hover:shadow-[var(--primary)]/30 disabled:opacity-50 transition-all duration-200"
              >
                {pwSaving ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </AppShell>
  );
}
