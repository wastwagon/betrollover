'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';

interface Settings {
  apiSportsConfigured: boolean;
  apiSportsKey?: string | null;
  dailyRequestsUsed?: number;
  dailyRequestsLimit?: number;
  lastTestDate?: string | null;
  isActive?: boolean;
  minimumROI?: number;
  platformCommissionRate?: number;
  currency: string;
  country: string;
  appName: string;
}

interface SyncStatus {
  id: number;
  syncType: string;
  lastSyncAt: string | null;
  status: string;
  lastError: string | null;
  lastSyncCount: number;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; usage?: { used: number; limit: number } } | null>(null);
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([]);
  const [syncingFixtures, setSyncingFixtures] = useState(false);
  const [syncingOdds, setSyncingOdds] = useState(false);
  const [minimumROI, setMinimumROI] = useState<number>(20.0);
  const [savingROI, setSavingROI] = useState(false);
  const [commissionRate, setCommissionRate] = useState<number>(10.0);
  const [savingCommission, setSavingCommission] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{ applied: { filename: string; appliedAt: string }[]; pending: string[] } | null>(null);
  const [migrationStatusLoaded, setMigrationStatusLoaded] = useState(false);
  const [runningMigrations, setRunningMigrations] = useState(false);
  const [markAllAppliedLoading, setMarkAllAppliedLoading] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [paystackSecretKey, setPaystackSecretKey] = useState('');
  const [paystackPublicKey, setPaystackPublicKey] = useState('');
  const [paystackMode, setPaystackMode] = useState<'live' | 'test'>('live');
  const [paystackConfigured, setPaystackConfigured] = useState(false);
  const [paystackSaving, setPaystackSaving] = useState(false);
  const [paystackSaveResult, setPaystackSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch(`${getApiUrl()}/admin/settings`, { 
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store' // Prevent caching
    })
      .then(async (r) => {
        if (!r.ok) {
          console.error('Settings API error:', r.status, await r.text());
          return null;
        }
        const data = await r.json();
        console.log('Settings loaded:', data);
        return data;
      })
      .then((data) => {
        setSettings(data);
        if (data?.minimumROI !== undefined) setMinimumROI(data.minimumROI);
        if (data?.platformCommissionRate !== undefined) setCommissionRate(data.platformCommissionRate);
        return data;
      })
      .catch((e) => {
        console.error('Settings fetch error:', e);
        setSettings(null);
      })
      .finally(() => setLoading(false));

    // Load sync statuses and migration status
    loadSyncStatus();
    loadMigrationStatus();
    loadPaystackSettings();
  }, [router]);

  const loadPaystackSettings = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${getApiUrl()}/admin/settings/paystack`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPaystackSecretKey(data.secretKey || '');
        setPaystackPublicKey(data.publicKey || '');
        setPaystackMode((data.mode || 'live') as 'live' | 'test');
        setPaystackConfigured(data.configured || false);
      }
    } catch (e) {
      console.error('Failed to load Paystack settings:', e);
    }
  };

  const loadSyncStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await fetch(`${getApiUrl()}/fixtures/sync/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSyncStatuses(data || []);
      }
    } catch (e) {
      console.error('Failed to load sync status:', e);
    }
  };

  const loadMigrationStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${getApiUrl()}/admin/migrations/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMigrationStatus({
          applied: (data.applied || []).map((a: { filename: string; appliedAt: string }) => ({
            filename: a.filename,
            appliedAt: a.appliedAt,
          })),
          pending: data.pending || [],
        });
      } else if (res.status === 404) {
        setMigrationStatus(null);
      }
    } catch {
      setMigrationStatus(null);
    } finally {
      setMigrationStatusLoaded(true);
    }
  };

  const runMigrations = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setRunningMigrations(true);
    setMigrationMessage(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/migrations/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      await loadMigrationStatus();
      if (data.applied?.length > 0) {
        setMigrationMessage({ type: 'success', text: data.message || `Applied ${data.applied.length} migration(s).` });
      }
      if (data.errors?.length > 0) {
        setMigrationMessage({ type: 'error', text: data.message || data.errors.join('; ') });
      }
      if (data.applied?.length === 0 && !data.errors?.length) {
        setMigrationMessage({ type: 'success', text: data.message || 'No pending migrations.' });
      }
    } catch (e: any) {
      setMigrationMessage({ type: 'error', text: e?.message || 'Failed to run migrations.' });
    } finally {
      setRunningMigrations(false);
    }
  };

  const markAllMigrationsApplied = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!confirm('Mark all current migration files as applied without running them? Use this only when this database was already migrated manually (e.g. first deploy of this feature).')) return;
    setMarkAllAppliedLoading(true);
    setMigrationMessage(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/migrations/mark-all-applied`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      await loadMigrationStatus();
      setMigrationMessage({ type: 'success', text: data.marked > 0 ? `Marked ${data.marked} migration(s) as applied.` : 'No new migrations to mark.' });
    } catch (e: any) {
      setMigrationMessage({ type: 'error', text: e?.message || 'Failed to mark migrations.' });
    } finally {
      setMarkAllAppliedLoading(false);
    }
  };

  const syncFixtures = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    setSyncingFixtures(true);
    try {
      const res = await fetch(`${getApiUrl()}/fixtures/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await loadSyncStatus();
        setTestResult({ success: true, message: 'Fixtures synced successfully!' });
      } else {
        const error = await res.json().catch(() => ({}));
        setTestResult({ success: false, message: error.message || 'Failed to sync fixtures' });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Failed to sync fixtures' });
    } finally {
      setSyncingFixtures(false);
    }
  };

  const syncOdds = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    setSyncingOdds(true);
    try {
      const res = await fetch(`${getApiUrl()}/fixtures/sync/odds`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        await loadSyncStatus();
        setTestResult({ 
          success: true, 
          message: `Odds synced successfully! ${data.synced || 0} fixtures updated.` 
        });
      } else {
        const error = await res.json().catch(() => ({}));
        setTestResult({ success: false, message: error.message || 'Failed to sync odds' });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Failed to sync odds' });
    } finally {
      setSyncingOdds(false);
    }
  };

  useEffect(() => {
    if (settings?.apiSportsKey) {
      setApiKey(settings.apiSportsKey);
    }
    if (settings?.dailyRequestsLimit && settings?.dailyRequestsUsed !== undefined) {
      setUsage({
        used: settings.dailyRequestsUsed,
        limit: settings.dailyRequestsLimit,
        remaining: settings.dailyRequestsLimit - settings.dailyRequestsUsed,
      });
    } else if (settings?.apiSportsConfigured) {
      // Load usage if API is configured but usage not in settings
      loadUsage();
    }
  }, [settings]);

  const loadUsage = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await fetch(`${getApiUrl()}/admin/settings/api-sports/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data) setUsage(data);
      }
    } catch (e) {
      console.error('Failed to load usage:', e);
    }
  };

  const sendTestEmail = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setTestEmailResult({ success: false, message: 'Please log in to send a test email.' });
      return;
    }
    if (!testEmailTo.trim()) {
      setTestEmailResult({ success: false, message: 'Enter an email address' });
      return;
    }
    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/test-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: testEmailTo.trim() }),
      });
      let data: { sent?: boolean; error?: string; message?: string } = {};
      try {
        data = await res.json();
      } catch {
        setTestEmailResult({ success: false, message: `Request failed (${res.status}). Check that SENDGRID_API_KEY is set in .env.` });
        setTestEmailLoading(false);
        return;
      }
      const success = res.ok && data?.sent !== false;
      const message = data?.message || (success ? 'Test email sent! Check your inbox.' : data?.error || data?.message || `Failed to send (${res.status})`);
      setTestEmailResult({ success, message });
    } catch (e: any) {
      setTestEmailResult({ success: false, message: e?.message || 'Network error. Check that the API is running.' });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const testConnection = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const res = await fetch(`${getApiUrl()}/admin/settings/api-sports/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: apiKey || undefined }),
      });
      
      const data = await res.json();
      setTestResult(data);
      
      if (data.success && data.usage) {
        setUsage({
          used: data.usage.used,
          limit: data.usage.limit,
          remaining: data.usage.limit - data.usage.used,
        });
        // Reload settings to get updated status
        const settingsRes = await fetch(`${getApiUrl()}/admin/settings`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (settingsRes.ok) {
          setSettings(await settingsRes.json());
        }
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Failed to test connection' });
    } finally {
      setTesting(false);
    }
  };

  const saveApiKey = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'API key is required' });
      return;
    }
    
    setSaving(true);
    setTestResult(null);
    
    try {
      const res = await fetch(`${getApiUrl()}/admin/settings/api-sports`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        setTestResult({ success: false, message: error.message || 'Failed to save API key' });
        return;
      }
      
      // Test the connection after saving
      await testConnection();
      
      // Reload settings
      const settingsRes = await fetch(`${getApiUrl()}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Failed to save API key' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Platform Settings</h1>
              <p className="text-gray-600 dark:text-gray-400">API keys, migrations, and platform configuration.</p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading settings...</p>
            </div>
          </div>
        )}
        {!loading && !settings && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-8 max-w-2xl">
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">Could not load settings</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              The settings API may be unavailable or your session may have expired. Try refreshing the page or logging in again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && settings && (
          <div className="space-y-8 max-w-6xl">
            {/* API Configuration Card */}
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 overflow-hidden transition-all hover:shadow-2xl ${
              settings.apiSportsConfigured 
                ? 'border-emerald-200 dark:border-emerald-800' 
                : 'border-amber-200 dark:border-amber-800'
            }`}>
              <div className={`p-8 ${
                settings.apiSportsConfigured 
                  ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20' 
                  : 'bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20'
              }`}>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      settings.apiSportsConfigured 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-amber-500 text-white'
                    }`}>
                      {settings.apiSportsConfigured ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">API-Sports Football</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        External API integration for fixtures and match data
                      </p>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                          settings.apiSportsConfigured
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                        }`}>
                          {settings.apiSportsConfigured ? '✓ Active' : '⚠ Not Configured'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API Key Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API-Sports API key"
                        className="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {showApiKey ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.066 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Usage Display */}
                  {usage && usage.limit > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily API Usage</span>
                        <span className={`text-sm font-semibold ${
                          usage.remaining < usage.limit * 0.1 
                            ? 'text-red-600 dark:text-red-400' 
                            : usage.remaining < usage.limit * 0.3
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {usage.remaining} / {usage.limit} remaining
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            usage.remaining < usage.limit * 0.1
                              ? 'bg-red-500'
                              : usage.remaining < usage.limit * 0.3
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${(usage.remaining / usage.limit) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {usage.used} requests used today
                      </p>
                    </div>
                  )}

                  {/* Test Result */}
                  {testResult && (
                    <div className={`p-4 rounded-xl ${
                      testResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}>
                      <div className="flex items-start gap-3">
                        {testResult.success ? (
                          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            testResult.success
                              ? 'text-emerald-800 dark:text-emerald-200'
                              : 'text-red-800 dark:text-red-200'
                          }`}>
                            {testResult.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={testConnection}
                      disabled={testing || !apiKey.trim()}
                      className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {testing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Test Connection
                        </>
                      )}
                    </button>
                    <button
                      onClick={saveApiKey}
                      disabled={saving || !apiKey.trim()}
                      className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save & Test
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SendGrid / Email Test */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-emerald-200 dark:border-emerald-800 overflow-hidden">
              <div className="p-8 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-emerald-500 text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Email (SendGrid)</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Test email delivery. Configure SENDGRID_API_KEY and SMTP_FROM in .env.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <input
                    type="email"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    placeholder="Enter email to receive test"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {testEmailResult && (
                    <div
                      role="alert"
                      className={`p-4 rounded-xl text-sm font-medium border-2 ${
                        testEmailResult.success
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-400 text-red-800 dark:text-red-200'
                      }`}
                    >
                      {testEmailResult.success ? '✓ ' : '✗ '}
                      {testEmailResult.message}
                    </div>
                  )}
                  <button
                    onClick={sendTestEmail}
                    disabled={testEmailLoading || !testEmailTo.trim()}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center gap-2"
                  >
                    {testEmailLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Send Test Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Paystack Payment Gateway */}
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 overflow-hidden ${
              paystackConfigured
                ? 'border-emerald-200 dark:border-emerald-800'
                : 'border-amber-200 dark:border-amber-800'
            }`}>
              <div className={`p-8 ${
                paystackConfigured
                  ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20'
                  : 'bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20'
              }`}>
                <div className="flex items-start gap-4 mb-6">
                  <div className={`p-3 rounded-xl ${paystackConfigured ? 'bg-emerald-500' : 'bg-amber-500'} text-white`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Paystack Payment Gateway</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Configure Paystack API keys for wallet deposits and withdrawals (GHS, Mobile Money, cards).
                    </p>
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                      paystackConfigured
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                    }`}>
                      {paystackConfigured ? '✓ Configured' : '⚠ Not Configured'}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mode</label>
                    <select
                      value={paystackMode}
                      onChange={(e) => setPaystackMode(e.target.value as 'live' | 'test')}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
                    >
                      <option value="live">Live</option>
                      <option value="test">Test</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Secret Key (sk_live_... or sk_test_...)</label>
                    <input
                      type="password"
                      value={paystackSecretKey}
                      onChange={(e) => setPaystackSecretKey(e.target.value)}
                      placeholder="sk_live_xxxx or sk_test_xxxx"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Public Key (pk_live_... or pk_test_...)</label>
                    <input
                      type="password"
                      value={paystackPublicKey}
                      onChange={(e) => setPaystackPublicKey(e.target.value)}
                      placeholder="pk_live_xxxx or pk_test_xxxx"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500"
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Get keys from <a href="https://dashboard.paystack.com/#/settings/developers" target="_blank" rel="noopener noreferrer" className="text-red-600 dark:text-red-400 underline">Paystack Dashboard</a>. Leave blank to keep existing. .env PAYSTACK_SECRET_KEY is used as fallback if not set here.
                  </p>
                  {paystackSaveResult && (
                    <div className={`p-4 rounded-xl text-sm font-medium ${
                      paystackSaveResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                    }`}>
                      {paystackSaveResult.success ? '✓ ' : '✗ '}{paystackSaveResult.message}
                    </div>
                  )}
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      if (!token) return;
                      setPaystackSaving(true);
                      setPaystackSaveResult(null);
                      try {
                        const res = await fetch(`${getApiUrl()}/admin/settings/paystack`, {
                          method: 'PATCH',
                          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            secretKey: paystackSecretKey || undefined,
                            publicKey: paystackPublicKey || undefined,
                            mode: paystackMode,
                          }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok) {
                          setPaystackSaveResult({ success: true, message: 'Paystack settings saved.' });
                          setPaystackConfigured(data.configured || false);
                        } else {
                          setPaystackSaveResult({ success: false, message: data.message || 'Failed to save' });
                        }
                      } catch (e: any) {
                        setPaystackSaveResult({ success: false, message: e?.message || 'Network error' });
                      } finally {
                        setPaystackSaving(false);
                      }
                    }}
                    disabled={paystackSaving}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center gap-2"
                  >
                    {paystackSaving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Paystack Settings
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Database migrations – auto-run on deploy; admin can run or mark applied */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-8 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-slate-600 text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Database migrations</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Pending migrations run automatically on API startup. You can run them here or mark existing DB as up to date.
                      </p>
                    </div>
                  </div>
                </div>
                {migrationMessage && (
                  <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${migrationMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'}`}>
                    {migrationMessage.text}
                  </div>
                )}
                {!migrationStatusLoaded ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading migration status...</p>
                ) : migrationStatus ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-white/80 dark:bg-gray-700/80 rounded-xl">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Applied</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{migrationStatus.applied.length}</p>
                        {migrationStatus.applied.length > 0 && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{migrationStatus.applied[migrationStatus.applied.length - 1]?.filename}</p>
                        )}
                      </div>
                      <div className="p-3 bg-white/80 dark:bg-gray-700/80 rounded-xl">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Pending</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{migrationStatus.pending.length}</p>
                        {migrationStatus.pending.length > 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">{migrationStatus.pending.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={runMigrations}
                        disabled={runningMigrations || (migrationStatus.pending.length === 0)}
                        className="px-5 py-2.5 bg-slate-600 hover:bg-slate-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center gap-2"
                      >
                        {runningMigrations ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>Run pending migrations</>
                        )}
                      </button>
                      <button
                        onClick={markAllMigrationsApplied}
                        disabled={markAllAppliedLoading}
                        className="px-5 py-2.5 bg-slate-500 hover:bg-slate-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
                      >
                        {markAllAppliedLoading ? '...' : 'Mark all as applied'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      Use &quot;Mark all as applied&quot; only when this database was already migrated manually (e.g. first production deploy). New migrations (010–021) run automatically on every API start.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Migration status unavailable. Rebuild and restart the API to enable automatic migrations and this panel.
                  </p>
                )}
              </div>
            </div>

            {/* Sync Status & Manual Sync */}
            {settings.apiSportsConfigured && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-blue-200 dark:border-blue-800 overflow-hidden">
                <div className="p-8 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-blue-500 text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Data Synchronization</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Automatic sync runs daily. You can also manually sync fixtures and odds.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sync Status Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {syncStatuses.map((status) => {
                      const getStatusColor = (s: string) => {
                        if (s === 'success') return 'emerald';
                        if (s === 'error') return 'red';
                        if (s === 'running') return 'blue';
                        return 'gray';
                      };
                      const color = getStatusColor(status.status);
                      const lastSync = status.lastSyncAt 
                        ? new Date(status.lastSyncAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })
                        : 'Never';

                      return (
                        <div
                          key={status.id}
                          className={`bg-white dark:bg-gray-700 rounded-xl p-4 border-2 border-${color}-200 dark:border-${color}-800`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
                              {status.syncType.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              status.status === 'success'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                : status.status === 'error'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : status.status === 'running'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {status.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Last sync: {lastSync}
                          </p>
                          {status.lastSyncCount > 0 && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {status.lastSyncCount} items synced
                            </p>
                          )}
                          {status.lastError && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 truncate">
                              Error: {status.lastError}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Manual Sync Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={syncFixtures}
                      disabled={syncingFixtures || !settings.apiSportsConfigured}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {syncingFixtures ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Syncing Fixtures...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Sync Fixtures Now
                        </>
                      )}
                    </button>
                    <button
                      onClick={syncOdds}
                      disabled={syncingOdds || !settings.apiSportsConfigured}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {syncingOdds ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Syncing Odds...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Sync Odds Now
                        </>
                      )}
                    </button>
                  </div>

                  {/* Automatic Sync Info */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>Automatic Sync Schedule:</strong> Fixtures sync daily at 6 AM for the next 7 days (industry best practice). 
                      Odds sync every 2 hours. Live fixtures update every 15 minutes. Finished fixtures update every 30 minutes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Platform Configuration Grid */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Platform Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Minimum ROI Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl shadow-lg border-2 border-blue-200 dark:border-blue-800 p-6 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Minimum ROI</h3>
                    <span className="text-2xl">📊</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Users must achieve this ROI% before they can sell paid coupons
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="0.1"
                      value={minimumROI}
                      onChange={(e) => setMinimumROI(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-600 dark:text-gray-400 font-medium">%</span>
                  </div>
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      if (!token) return;
                      setSavingROI(true);
                      try {
                        const res = await fetch(`${getApiUrl()}/admin/settings/minimum-roi`, {
                          method: 'PATCH',
                          headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ minimumROI }),
                        });
                        if (res.ok) {
                          alert('Minimum ROI updated successfully');
                          const settingsRes = await fetch(`${getApiUrl()}/admin/settings`, {
                            headers: { Authorization: `Bearer ${token}` },
                            cache: 'no-store',
                          });
                          if (settingsRes.ok) {
                            const data = await settingsRes.json();
                            setSettings(data);
                            if (data.minimumROI !== undefined) {
                              setMinimumROI(data.minimumROI);
                            }
                          }
                        } else {
                          const error = await res.json();
                          alert(error.message || 'Failed to update minimum ROI');
                        }
                      } catch (e: any) {
                        alert(e.message || 'Failed to update minimum ROI');
                      } finally {
                        setSavingROI(false);
                      }
                    }}
                    disabled={savingROI}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                  >
                    {savingROI ? 'Saving...' : 'Save Minimum ROI'}
                  </button>
                </div>

                {/* Platform Commission Rate Card */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-2xl shadow-lg border-2 border-amber-200 dark:border-amber-800 p-6 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Platform Commission</h3>
                    <span className="text-2xl">💰</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    % deducted from tipster payouts when a winning coupon is settled via escrow.
                  </p>
                  {/* Live preview */}
                  <div className="bg-amber-100/60 dark:bg-amber-900/30 rounded-xl p-3 mb-4 text-xs space-y-1">
                    <p className="font-semibold text-amber-800 dark:text-amber-200">Example payout (GHS 100 escrow)</p>
                    <p className="text-gray-600 dark:text-gray-400">Platform fee ({commissionRate}%): <span className="font-bold text-amber-700 dark:text-amber-300">GHS {(100 * commissionRate / 100).toFixed(2)}</span></p>
                    <p className="text-gray-600 dark:text-gray-400">Tipster receives: <span className="font-bold text-emerald-600">GHS {(100 - 100 * commissionRate / 100).toFixed(2)}</span></p>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Math.min(50, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-gray-600 dark:text-gray-400 font-medium">%</span>
                  </div>
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      if (!token) return;
                      setSavingCommission(true);
                      try {
                        const res = await fetch(`${getApiUrl()}/admin/settings/commission-rate`, {
                          method: 'PATCH',
                          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ platformCommissionRate: commissionRate }),
                        });
                        if (res.ok) {
                          alert(`Commission rate updated to ${commissionRate}%`);
                          const settingsRes = await fetch(`${getApiUrl()}/admin/settings`, {
                            headers: { Authorization: `Bearer ${token}` },
                            cache: 'no-store',
                          });
                          if (settingsRes.ok) {
                            const data = await settingsRes.json();
                            setSettings(data);
                            if (data.platformCommissionRate !== undefined) setCommissionRate(data.platformCommissionRate);
                          }
                        } else {
                          const error = await res.json().catch(() => ({}));
                          alert(error.message || 'Failed to update commission rate');
                        }
                      } catch (e: any) {
                        alert(e.message || 'Failed to update commission rate');
                      } finally {
                        setSavingCommission(false);
                      }
                    }}
                    disabled={savingCommission}
                    className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                  >
                    {savingCommission ? 'Saving...' : 'Save Commission Rate'}
                  </button>
                </div>

                {/* Currency Card */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl shadow-lg border-2 border-purple-200 dark:border-purple-800 p-6 hover:shadow-xl transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-purple-500 rounded-xl text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Currency</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{settings.currency}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Default currency for all transactions</p>
                </div>

                {/* Country Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl shadow-lg border-2 border-emerald-200 dark:border-emerald-800 p-6 hover:shadow-xl transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-emerald-500 rounded-xl text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Country</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{settings.country}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Primary operating region</p>
                </div>

                {/* App Name Card */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-2xl shadow-lg border-2 border-red-200 dark:border-red-800 p-6 hover:shadow-xl transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-red-500 rounded-xl text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">App Name</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{settings.appName}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Platform branding identifier</p>
                </div>
              </div>
            </div>

            {/* Information Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-500 rounded-lg text-white flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About Platform Settings</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    These settings are configured at the application level and are read-only in the admin panel. 
                    To modify platform configuration, update the environment variables in your backend <code className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs font-mono">.env</code> file 
                    and restart the application services.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
