'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { buttonClassName } from '@/components/ui/Button';

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: string;
  fromEmail: string;
  fromName: string;
  adminNotificationEmail: string;
}

export default function AdminEmailPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SmtpSettings | null>(null);
  const [form, setForm] = useState<SmtpSettings>({
    host: 'smtp.resend.com',
    port: 465,
    username: 'resend',
    password: '',
    encryption: 'SSL',
    fromEmail: 'noreply@betrollover.com',
    fromName: 'BetRollover',
    adminNotificationEmail: '',
  });
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [runningWelcome, setRunningWelcome] = useState(false);
  const [runningDaily, setRunningDaily] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/admin/smtp-settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSettings(data);
          setForm({
            host: data.host || 'smtp.resend.com',
            port: data.port ?? 465,
            username: data.username || 'resend',
            password: data.password || '',
            encryption: data.encryption || 'SSL',
            fromEmail: data.fromEmail || 'noreply@betrollover.com',
            fromName: data.fromName || 'BetRollover',
            adminNotificationEmail: data.adminNotificationEmail ?? '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    load();
  }, [router]);

  const save = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`${getApiUrl()}/admin/smtp-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg('Settings saved.');
        load();
      } else {
        setMsg(getApiErrorMessage(data, 'Save failed.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail) {
      setMsg('Enter a test email address.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    setTesting(true);
    setMsg('');
    try {
      const res = await fetch(`${getApiUrl()}/admin/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sent) {
        setMsg('Test email sent successfully!');
      } else {
        const api = getApiErrorMessage(data, '');
        const errField = typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : '';
        setMsg(api || errField || 'Failed to send test email.');
      }
    } finally {
      setTesting(false);
    }
  };

  const runWelcome = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setRunningWelcome(true);
    setMsg('');
    try {
      const res = await fetch(`${getApiUrl()}/admin/marketing/run-welcome`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(
          `Welcome series: ${data.sent ?? 0} sent, ${data.skipped ?? 0} skipped, ${data.errors ?? 0} errors.`,
        );
      } else {
        setMsg(getApiErrorMessage(data, 'Welcome series failed.'));
      }
    } finally {
      setRunningWelcome(false);
    }
  };

  const runDaily = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setRunningDaily(true);
    setMsg('');
    try {
      const res = await fetch(`${getApiUrl()}/admin/marketing/run-daily`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const welcome = data.welcome || {};
        const recap = data.recap || {};
        const digest = data.digest || {};
        const quiet = data.quiet || {};
        setMsg(
          `Marketing: welcome ${welcome.sent ?? 0} sent; recap ${recap.sent ?? 0} sent; digest ${digest.sent ?? 0} sent; quiet ${quiet.sent ?? 0} sent.`,
        );
      } else {
        setMsg(getApiErrorMessage(data, 'Daily marketing failed.'));
      }
    } finally {
      setRunningDaily(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">SMTP Configuration</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure Resend SMTP for transactional emails (OTP, notifications).</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading SMTP settings...</p>
            </div>
          </div>
        )}
        {!loading && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-[var(--card)] border-l-4 border-[var(--primary)] rounded-2xl p-6 shadow-sm border border-[var(--border)]">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Resend SMTP
              </h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                <li className="flex items-start gap-2">
                  <span className="font-semibold">SMTP Host:</span>
                  <span>smtp.resend.com</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">SMTP Port:</span>
                  <span>465 (SSL) or 587 (TLS)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">SMTP Username:</span>
                  <span>resend (literally the word &quot;resend&quot;)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">SMTP Password:</span>
                  <span>Your Resend API key (starts with re_)</span>
                </li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Production: set <code className="text-[11px] bg-gray-100 dark:bg-gray-700 px-1 rounded">RESEND_API_KEY</code> and{' '}
                <code className="text-[11px] bg-gray-100 dark:bg-gray-700 px-1 rounded">SMTP_FROM</code> on the API service in Coolify.
                SMTP fields below are only needed if you send via SMTP instead of the Resend API.
              </p>
              <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                Get your API key from Resend →
              </a>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">SMTP Settings</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">SMTP Host</label>
                  <input
                    type="text"
                    value={form.host}
                    onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">smtp.resend.com for Resend</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">SMTP Port</label>
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value, 10) || 465 }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">587 for TLS, 465 for SSL</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">SMTP Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">For Resend use: resend</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">SMTP Password (API Key)</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={settings?.password === '********' ? 'Leave blank to keep current' : ''}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Your Resend API key (starts with re_)</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Encryption</label>
                  <select
                    value={form.encryption}
                    onChange={(e) => setForm((f) => ({ ...f, encryption: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                  >
                    <option value="SSL">SSL (port 465)</option>
                    <option value="TLS">TLS (port 587)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Admin notification inbox</label>
                  <input
                    type="email"
                    value={form.adminNotificationEmail}
                    onChange={(e) => setForm((f) => ({ ...f, adminNotificationEmail: e.target.value }))}
                    placeholder="ops@yourcompany.com"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Receives platform alerts (withdrawal requests, support tickets, etc.) in addition to every account with the admin role. Leave blank to use only admin accounts. You can also set <code className="text-[11px] bg-gray-100 dark:bg-gray-700 px-1 rounded">ADMIN_NOTIFICATION_EMAIL</code> on the server (comma-separated).
                  </p>
                </div>
                <button type="button"
                  onClick={save}
                  disabled={saving}
                  className={buttonClassName({ className: 'w-full sm:w-auto' })}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-l-4 border-l-emerald-500 border border-gray-200 dark:border-gray-700 p-4 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Test Email Configuration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Send a test email to verify your SMTP configuration.</p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-stretch">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="w-full min-w-0 sm:flex-1 sm:min-w-[200px] px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <button type="button"
                  onClick={sendTest}
                  disabled={testing}
                  className={buttonClassName({ className: 'w-full sm:w-auto shrink-0' })}
                >
                  {testing ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Daily marketing (welcome, recap, digest, quiet)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Automated. Opt-in users only (Profile). One email per Accra day. 09:00 Africa/Accra plus 09:20 / 12:00 / 18:00
                catch-ups if the API was restarting. Welcome D0 also sends as soon as someone opts in.
                Order: welcome D0/D1/D3, Monday recap, Free Tip digest (active in last 7 days), then quiet 7/14d.
                Buttons below are fallback only. 18+ informational — not betting advice.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={runDaily}
                  disabled={runningDaily || runningWelcome}
                  className={buttonClassName({ className: 'w-full sm:w-auto' })}
                >
                  {runningDaily ? 'Running…' : 'Run today’s marketing (fallback)'}
                </button>
                <button
                  type="button"
                  onClick={runWelcome}
                  disabled={runningWelcome || runningDaily}
                  className={buttonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}
                >
                  {runningWelcome ? 'Running…' : 'Welcome series only'}
                </button>
              </div>
            </div>

            {msg && (
              <div className={`p-4 rounded-xl ${
                msg.includes('success') || msg.startsWith('Welcome series') || msg.startsWith('Marketing:') || msg.startsWith('Settings saved') 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 text-emerald-800 dark:text-emerald-200' 
                  : 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 text-amber-800 dark:text-amber-200'
              }`}>
                <p className="font-medium">{msg}</p>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
