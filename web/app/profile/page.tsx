'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';

import { getApiUrl, getAvatarUrl } from '@/lib/site-config';

interface Profile {
  id: number;
  email: string;
  username: string;
  displayName: string;
  avatar: string | null;
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
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
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
    fetch(`${getApiUrl()}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setProfile(data);
        setDisplayName(data.displayName || '');
        setPhone(data.phone || '');
        setAvatarUrl(data.avatar || '');
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
      const res = await fetch(`${getApiUrl()}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName, phone: phone || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const updated = await res.json();
        setProfile((p) => (p ? { ...p, ...updated } : null));
        setMsg('Profile updated.');
      } else {
        setMsg(data.message || 'Update failed.');
      }
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = getAvatarUrl(profile?.avatar ?? null, 96);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setAvatarUploading(true);
    setAvatarError(false);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch(`${getApiUrl()}/users/me/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setProfile((p) => (p ? { ...p, avatar: data.avatar } : null));
        setAvatarUrl(data.avatar || '');
      } else {
        setAvatarError(true);
      }
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const removeAvatar = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`${getApiUrl()}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar: null }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((p) => (p ? { ...p, avatar: null } : null));
        setAvatarUrl('');
        setMsg('Profile image removed.');
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
      const res = await fetch(`${getApiUrl()}/auth/change-password`, {
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
    <DashboardShell>
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
              <div className="flex flex-col sm:flex-row gap-6 mb-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--border)] flex items-center justify-center border-2 border-[var(--border)]">
                    {avatarSrc && !avatarError ? (
                      <Image
                        src={avatarSrc!}
                        alt="Profile"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span className="text-3xl font-bold text-[var(--text-muted)]">
                        {(profile?.displayName || profile?.username || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <label className="cursor-pointer text-sm font-medium text-[var(--primary)] hover:underline">
                    {avatarUploading ? 'Uploading...' : 'Change Photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleAvatarChange}
                      disabled={avatarUploading}
                    />
                  </label>
                  {avatarSrc && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      disabled={saving}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="flex-1 space-y-3">
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
                className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white hover:shadow-lg hover:shadow-[var(--primary)]/30 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
                </div>
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
    </DashboardShell>
  );
}
