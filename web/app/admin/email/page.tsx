'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: string;
  fromEmail: string;
  fromName: string;
}

export default function AdminEmailPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SmtpSettings | null>(null);
  const [form, setForm] = useState<SmtpSettings>({
    host: 'smtp.sendgrid.net',
    port: 465,
    username: 'apikey',
    password: '',
    encryption: 'SSL',
    fromEmail: 'noreply@betrollover.com',
    fromName: 'BetRollover',
  });
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/admin/smtp-settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSettings(data);
          setForm({
            host: data.host || 'smtp.sendgrid.net',
            port: data.port ?? 465,
            username: data.username || 'apikey',
            password: data.password || '',
            encryption: data.encryption || 'SSL',
            fromEmail: data.fromEmail || 'noreply@betrollover.com',
            fromName: data.fromName || 'BetRollover',
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
      const res = await fetch(`${API_URL}/admin/smtp-settings`, {
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
        setMsg(data.message || 'Save failed.');
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
      const res = await fetch(`${API_URL}/admin/test-email`, {
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
        setMsg(data.error || 'Failed to send test email.');
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">SMTP Configuration</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure SendGrid or another SMTP provider for transactional emails.</p>
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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-500 rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                SendGrid SMTP Configuration
              </h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                <li className="flex items-start gap-2">
                  <span className="font-semibold">SMTP Host:</span>
                  <span>smtp.sendgrid.net</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">SMTP Port:</span>
                  <span>587 (TLS) or 465 (SSL)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">SMTP Username:</span>
                  <span>apikey (literally the word &quot;apikey&quot;)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">SMTP Password:</span>
                  <span>Your SendGrid API Key (starts with SG.)</span>
                </li>
              </ul>
              <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                Get your API key from SendGrid Dashboard →
              </a>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">SMTP Settings</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">SMTP Host</label>
                  <input
                    type="text"
                    value={form.host}
                    onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">smtp.sendgrid.net for SendGrid</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">SMTP Port</label>
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value, 10) || 465 }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">587 for TLS, 465 for SSL</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">SMTP Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">For SendGrid use: apikey</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">SMTP Password (API Key)</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={settings?.password === '********' ? 'Leave blank to keep current' : ''}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Your SendGrid API Key (starts with SG.)</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Encryption</label>
                  <select
                    value={form.encryption}
                    onChange={(e) => setForm((f) => ({ ...f, encryption: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  >
                    <option value="SSL">SSL (port 465)</option>
                    <option value="TLS">TLS (port 587)</option>
                  </select>
                </div>
                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-l-4 border-l-emerald-500 border border-gray-200 dark:border-gray-700 p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Test Email Configuration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Send a test email to verify your SMTP configuration.</p>
              <div className="flex gap-4 flex-wrap">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 min-w-[250px] px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={sendTest}
                  disabled={testing}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  {testing ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </div>

            {msg && (
              <div className={`p-4 rounded-xl ${
                msg.includes('success') 
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
