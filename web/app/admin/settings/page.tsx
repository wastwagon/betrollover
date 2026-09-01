'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { buttonClassName } from '@/components/ui/Button';
import { Input, Field, fieldControlClassName } from '@/components/ui/Input';
import { ACCA_GENERATOR_LEGS_MAX, ACCA_GENERATOR_LEGS_MIN } from '@betrollover/shared-types';

interface Settings {
  apiSportsConfigured: boolean;
  apiSportsKey?: string | null;
  dailyRequestsUsed?: number;
  dailyRequestsLimit?: number;
  lastTestDate?: string | null;
  isActive?: boolean;
  minimumROI?: number;
  minimumWinRate?: number;
  /** GHS price for AI marketplace picks when ROI + win rate meet minimums; 0 = AI always free */
  aiMarketplaceCouponPrice?: number;
  maxCouponsPerDay?: number;
  /** Per AI tipster, UTC day; engine uses min(this, each tipster max in code config). */
  aiMaxCouponsPerDay?: number;
  platformCommissionRate?: number;
  streamAlertThresholds?: {
    warnActiveConnections: number;
    criticalActiveConnections: number;
    warnEventsPerMinute: number;
    warnAvgPayloadBytes: number;
    warnStaleSeconds: number;
    criticalStaleSeconds: number;
  };
  accaGenerator?: {
    enabled: boolean;
    minLegs: number;
    maxLegs: number;
    dailyGenerations: number;
    legsCeiling?: number;
  };
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

const pad2 = (n: number) => String(n).padStart(2, '0');

/** ISO → `YYYY-MM-DD HH:mm:ss` in the viewer's local timezone (consistent padding, 24h). */
function formatSyncTimestamp(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
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
  const [syncingArchive, setSyncingArchive] = useState(false);
  const [minimumROI, setMinimumROI] = useState<number>(20.0);
  const [savingROI, setSavingROI] = useState(false);
  const [minimumWinRate, setMinimumWinRate] = useState<number>(30.0);
  const [savingWinRate, setSavingWinRate] = useState(false);
  const [aiMarketplaceCouponPrice, setAiMarketplaceCouponPrice] = useState<number>(5.0);
  const [savingAiCouponPrice, setSavingAiCouponPrice] = useState(false);
  const [maxCouponsPerDay, setMaxCouponsPerDay] = useState<number>(0);
  const [savingCouponLimit, setSavingCouponLimit] = useState(false);
  const [aiMaxCouponsPerDay, setAiMaxCouponsPerDay] = useState<number>(2);
  const [savingAiMaxCoupons, setSavingAiMaxCoupons] = useState(false);
  const [accaEnabled, setAccaEnabled] = useState(true);
  const [accaMinLegs, setAccaMinLegs] = useState(2);
  const [accaMaxLegs, setAccaMaxLegs] = useState(8);
  const [accaDailyGenerations, setAccaDailyGenerations] = useState(10);
  const [accaLegsCeiling, setAccaLegsCeiling] = useState(ACCA_GENERATOR_LEGS_MAX);
  const [savingAccaGenerator, setSavingAccaGenerator] = useState(false);
  const [commissionRate, setCommissionRate] = useState<number>(30.0);
  const [savingCommission, setSavingCommission] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{ applied: { filename: string; appliedAt: string }[]; pending: string[] } | null>(null);
  const [migrationStatusLoaded, setMigrationStatusLoaded] = useState(false);
  const [runningMigrations, setRunningMigrations] = useState(false);
  const [markAllAppliedLoading, setMarkAllAppliedLoading] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [adminNotificationEmail, setAdminNotificationEmail] = useState('');
  const [savingAdminNotificationEmail, setSavingAdminNotificationEmail] = useState(false);
  const [adminNotificationEmailMsg, setAdminNotificationEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [paystackSecretKey, setPaystackSecretKey] = useState('');
  const [paystackPublicKey, setPaystackPublicKey] = useState('');
  const [paystackMode, setPaystackMode] = useState<'live' | 'test'>('live');
  const [paystackConfigured, setPaystackConfigured] = useState(false);
  const [paystackTransfersEnabled, setPaystackTransfersEnabled] = useState(false);
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
        return r.json();
      })
      .then((data) => {
        setSettings(data);
        if (data?.minimumROI !== undefined) setMinimumROI(data.minimumROI);
        if (data?.minimumWinRate !== undefined) setMinimumWinRate(data.minimumWinRate);
        if (data?.aiMarketplaceCouponPrice !== undefined) setAiMarketplaceCouponPrice(data.aiMarketplaceCouponPrice);
        if (data?.maxCouponsPerDay !== undefined) setMaxCouponsPerDay(data.maxCouponsPerDay);
        if (data?.aiMaxCouponsPerDay !== undefined) setAiMaxCouponsPerDay(data.aiMaxCouponsPerDay);
        if (data?.accaGenerator) {
          setAccaEnabled(data.accaGenerator.enabled !== false);
          setAccaMinLegs(data.accaGenerator.minLegs ?? 2);
          setAccaMaxLegs(data.accaGenerator.maxLegs ?? 8);
          setAccaDailyGenerations(data.accaGenerator.dailyGenerations ?? 10);
          setAccaLegsCeiling(data.accaGenerator.legsCeiling ?? ACCA_GENERATOR_LEGS_MAX);
        }
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
    loadSmtpNotificationInbox();
  }, [router]);

  const loadSmtpNotificationInbox = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${getApiUrl()}/admin/smtp-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminNotificationEmail(typeof data?.adminNotificationEmail === 'string' ? data.adminNotificationEmail : '');
      }
    } catch {
      /* noop */
    }
  };

  const saveAdminNotificationEmail = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSavingAdminNotificationEmail(true);
    setAdminNotificationEmailMsg(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/smtp-settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotificationEmail: adminNotificationEmail.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAdminNotificationEmailMsg({ type: 'success', text: 'Admin notification inbox saved.' });
        await loadSmtpNotificationInbox();
      } else {
        setAdminNotificationEmailMsg({
          type: 'error',
          text: getApiErrorMessage(data, `Save failed (${res.status}).`),
        });
      }
    } catch (e: unknown) {
      setAdminNotificationEmailMsg({
        type: 'error',
        text: e instanceof Error ? e.message : 'Network error.',
      });
    } finally {
      setSavingAdminNotificationEmail(false);
    }
  };

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
        setPaystackTransfersEnabled(data.transfersEnabled === true);
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
        setMigrationMessage({
          type: 'success',
          text: getApiErrorMessage(data, `Applied ${data.applied.length} migration(s).`),
        });
      }
      if (data.errors?.length > 0) {
        const errFallback = Array.isArray(data.errors) ? data.errors.join('; ') : 'Migration failed';
        setMigrationMessage({ type: 'error', text: getApiErrorMessage(data, errFallback) });
      }
      if (data.applied?.length === 0 && !data.errors?.length) {
        setMigrationMessage({ type: 'success', text: getApiErrorMessage(data, 'No pending migrations.') });
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
        setTestResult({ success: false, message: getApiErrorMessage(error, 'Failed to sync fixtures') });
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
        setTestResult({ success: false, message: getApiErrorMessage(error, 'Failed to sync odds') });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Failed to sync odds' });
    } finally {
      setSyncingOdds(false);
    }
  };

  const syncArchive = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setSyncingArchive(true);
    try {
      const res = await fetch(`${getApiUrl()}/fixtures/sync/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      await loadSyncStatus();
      if (res.ok) {
        setTestResult({
          success: true,
          message: data.message || `Archive finished (${data.archived ?? 0} fixtures).`,
        });
      } else {
        setTestResult({ success: false, message: getApiErrorMessage(data, 'Failed to run archive') });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Failed to run archive' });
    } finally {
      setSyncingArchive(false);
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
        setTestEmailResult({ success: false, message: `Request failed (${res.status}). Check that RESEND_API_KEY is set in Coolify.` });
        setTestEmailLoading(false);
        return;
      }
      const success = res.ok && data?.sent !== false;
      const apiLine = getApiErrorMessage(data, '');
      const message = apiLine
        ? apiLine
        : success
          ? 'Test email sent! Check your inbox.'
          : (typeof data?.error === 'string' && data.error.trim() ? data.error : `Failed to send (${res.status})`);
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
        setTestResult({ success: false, message: getApiErrorMessage(error, 'Failed to save API key') });
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
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <div className="mb-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Platform Settings</h1>
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
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-8 max-w-2xl">
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">Could not load settings</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              The settings API may be unavailable or your session may have expired. Try refreshing the page or logging in again.
            </p>
            <button type="button"
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
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
              settings.apiSportsConfigured 
                ? 'border-emerald-200 dark:border-emerald-800' 
                : 'border-amber-200 dark:border-amber-800'
            }`}>
              <div className={`p-4 sm:p-8 ${
                settings.apiSportsConfigured 
                  ? 'bg-[var(--primary-light)]' 
                  : 'bg-amber-50/70 dark:bg-amber-950/20'
              }`}>
                <div className="flex items-start justify-between mb-6 min-w-0">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className={`p-3 rounded-xl shrink-0 ${
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
                    <div className="min-w-0">
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
                          {settings.apiSportsConfigured ? 'Active' : 'Not configured'}
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
                      <Input
                        id="admin-api-key"
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API-Sports API key"
                        className="pr-12"
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
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
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
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button type="button"
                      onClick={testConnection}
                      disabled={testing || !apiKey.trim()}
                      className={buttonClassName({ className: 'flex-1' })}
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
                    <button type="button"
                      onClick={saveApiKey}
                      disabled={saving || !apiKey.trim()}
                      className={buttonClassName({ className: 'flex-1' })}
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

            {/* Resend / Email Test */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 border-emerald-200 dark:border-emerald-800 overflow-hidden">
              <div className="p-4 sm:p-8 bg-[var(--primary-light)]">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-emerald-500 text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Email (Resend)</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Test email delivery. Production uses RESEND_API_KEY and SMTP_FROM in Coolify. Full SMTP fallback settings are on{' '}
                      <Link href="/admin/email" className="text-emerald-700 dark:text-emerald-300 font-medium underline underline-offset-2">
                        Admin → Email / SMTP
                      </Link>
                      .
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border-2 border-emerald-200/80 dark:border-emerald-800/80 bg-white/80 dark:bg-gray-800/80 p-4 space-y-2">
                    <Input
                      id="admin-notification-inbox"
                      label="Admin notification inbox"
                      type="email"
                      value={adminNotificationEmail}
                      onChange={(e) => setAdminNotificationEmail(e.target.value)}
                      placeholder="ops@yourcompany.com"
                      hint="Receives system alerts (withdrawals, support tickets, etc.) in addition to every user with the admin role. Optional: set ADMIN_NOTIFICATION_EMAIL on the server (comma-separated)."
                    />
                    {adminNotificationEmailMsg && (
                      <p
                        role="status"
                        className={`text-sm font-medium ${adminNotificationEmailMsg.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}
                      >
                        {adminNotificationEmailMsg.text}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={saveAdminNotificationEmail}
                      disabled={savingAdminNotificationEmail}
                      className={buttonClassName({ size: 'sm' })}
                    >
                      {savingAdminNotificationEmail ? 'Saving…' : 'Save notification inbox'}
                    </button>
                  </div>
                  <Input
                    id="admin-test-email"
                    type="email"
                    label="Send a test email"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    placeholder="Enter email to receive test"
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
                  <button type="button"
                    onClick={sendTestEmail}
                    disabled={testEmailLoading || !testEmailTo.trim()}
                    className={buttonClassName()}
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
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 overflow-hidden ${
              paystackConfigured
                ? 'border-emerald-200 dark:border-emerald-800'
                : 'border-amber-200 dark:border-amber-800'
            }`}>
              <div className={`p-4 sm:p-8 ${
                paystackConfigured
                  ? 'bg-[var(--primary-light)]'
                  : 'bg-amber-50/70 dark:bg-amber-950/20'
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
                      Configure Paystack API keys for wallet deposits. Instant Ghana Mobile Money payouts (Transfers) stay off until you enable them below — Paystack Starter businesses cannot send third-party payouts. After you are a Registered Business: enable Transfers, uncheck “Confirm transfers” (OTP), and subscribe the webhook to charge.success plus transfer.success, transfer.failed, and transfer.reversed.
                    </p>
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                      paystackConfigured
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                    }`}>
                      {paystackConfigured ? 'Configured' : 'Not configured'}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <Field label="Mode" htmlFor="paystack-mode">
                    <select
                      id="paystack-mode"
                      value={paystackMode}
                      onChange={(e) => setPaystackMode(e.target.value as 'live' | 'test')}
                      className={fieldControlClassName()}
                    >
                      <option value="live">Live</option>
                      <option value="test">Test</option>
                    </select>
                  </Field>
                  <Input
                    id="paystack-secret"
                    type="password"
                    label="Secret Key (sk_live_... or sk_test_...)"
                    value={paystackSecretKey}
                    onChange={(e) => setPaystackSecretKey(e.target.value)}
                    placeholder="sk_live_xxxx or sk_test_xxxx"
                  />
                  <Input
                    id="paystack-public"
                    type="password"
                    label="Public Key (pk_live_... or pk_test_...)"
                    value={paystackPublicKey}
                    onChange={(e) => setPaystackPublicKey(e.target.value)}
                    placeholder="pk_live_xxxx or pk_test_xxxx"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Get keys from <a href="https://dashboard.paystack.com/#/settings/developers" target="_blank" rel="noopener noreferrer" className="text-red-600 dark:text-red-400 underline">Paystack Dashboard</a>. Leave blank to keep existing. .env PAYSTACK_SECRET_KEY is used as fallback if not set here.
                  </p>
                  <label className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={paystackTransfersEnabled}
                      onChange={(e) => setPaystackTransfersEnabled(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300"
                    />
                    <span>
                      <span className="font-semibold">Enable instant Mobile Money payouts</span>
                      <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        Uses Paystack Transfers. Leave off on a Starter account — withdrawals stay on the admin manual queue. Turn on only after Paystack has approved a Registered Business.
                      </span>
                    </span>
                  </label>
                  {paystackSaveResult && (
                    <div className={`p-4 rounded-xl text-sm font-medium ${
                      paystackSaveResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                    }`}>
                      {paystackSaveResult.success ? '✓ ' : '✗ '}{paystackSaveResult.message}
                    </div>
                  )}
                  <button type="button"
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
                            transfersEnabled: paystackTransfersEnabled,
                          }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok) {
                          setPaystackSaveResult({ success: true, message: 'Paystack settings saved.' });
                          setPaystackConfigured(data.configured || false);
                          setPaystackTransfersEnabled(data.transfersEnabled === true);
                        } else {
                          setPaystackSaveResult({ success: false, message: getApiErrorMessage(data, 'Failed to save') });
                        }
                      } catch (e: any) {
                        setPaystackSaveResult({ success: false, message: e?.message || 'Network error' });
                      } finally {
                        setPaystackSaving(false);
                      }
                    }}
                    disabled={paystackSaving}
                    className={buttonClassName()}
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 sm:p-8 bg-[var(--fill-secondary)]">
                <div className="flex items-start justify-between mb-6 min-w-0">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="p-3 rounded-xl bg-slate-600 text-white shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Database migrations</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Pending SQL files matching <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">NNN_description.sql</code> in{' '}
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">database/migrations</code> run automatically: on Docker/Coolify they run in the
                        container entrypoint (before Node starts), then the API runs any still-pending migrations at bootstrap. This panel shows status and lets you run or mark applied manually.
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
                      <button type="button"
                        onClick={runMigrations}
                        disabled={runningMigrations || (migrationStatus.pending.length === 0)}
                        className={buttonClassName()}
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
                      <button type="button"
                        onClick={markAllMigrationsApplied}
                        disabled={markAllAppliedLoading}
                        className={buttonClassName({ variant: 'secondary' })}
                      >
                        {markAllAppliedLoading ? '...' : 'Mark all as applied'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      Use &quot;Mark all as applied&quot; only when this database was already migrated manually (e.g. imported dump or first production deploy) so the tracker matches reality without re-running SQL. Normal deploys do not need this.
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
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 border-blue-200 dark:border-blue-800 overflow-hidden">
                <div className="p-4 sm:p-8 bg-[var(--fill-secondary)]">
                  <div className="flex items-start justify-between mb-6 min-w-0">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="p-3 rounded-xl bg-blue-500 text-white shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div className="min-w-0">
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
                      const borderClass =
                        status.status === 'success'
                          ? 'border-emerald-200 dark:border-emerald-800'
                          : status.status === 'error'
                            ? 'border-red-200 dark:border-red-800'
                            : status.status === 'running'
                              ? 'border-blue-200 dark:border-blue-800'
                              : 'border-gray-200 dark:border-gray-600';

                      const lastSync = formatSyncTimestamp(status.lastSyncAt);

                      return (
                        <div
                          key={status.id}
                          className={`bg-white dark:bg-gray-700 rounded-xl p-4 border-2 ${borderClass}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
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
                    <button type="button"
                      onClick={syncFixtures}
                      disabled={syncingFixtures || !settings.apiSportsConfigured}
                      className={buttonClassName({ className: 'flex-1' })}
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
                    <button type="button"
                      onClick={syncOdds}
                      disabled={syncingOdds || !settings.apiSportsConfigured}
                      className={buttonClassName({ className: 'flex-1' })}
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
                    <button type="button"
                      onClick={syncArchive}
                      disabled={syncingArchive}
                      className={buttonClassName({ className: 'flex-1' })}
                    >
                      {syncingArchive ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Archiving...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          Run Archive Now
                        </>
                      )}
                    </button>
                  </div>

                  {/* Automatic Sync Info */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>Automatic Sync Schedule:</strong> Full fixture import (same as &quot;Sync Fixtures&quot;) runs{' '}
                      <strong>every 6 hours</strong> at 00:00, 06:00, 12:00, and 18:00 <strong>server local time</strong>.{' '}
                      <strong>AI predictions</strong> generate daily at <strong>8:00 PM</strong> (Africa/Accra by default).{' '}
                      <strong>Odds force refresh</strong> runs at <strong>23:45</strong> so markets are primed before that run. Set{' '}
                      <code className="text-xs">TZ</code> on the API host (e.g. <code className="text-xs">Africa/Accra</code>) if
                      those ticks should follow your region. Requires <code className="text-xs">ENABLE_SCHEDULING=true</code>.
                      On startup, the API logs a warning if scheduling or football sync is disabled — check host logs if nothing
                      updates automatically. Free/serverless hosts that sleep still need always-on or an external uptime ping so
                      the process can run crons. Only <strong>enabled</strong> leagues are stored. Odds sync every 2 hours. Live
                      updates about every minute; finished results about every minute; settlement about every minute. Last sync times below use your browser&apos;s local
                      timezone, <strong>YYYY-MM-DD HH:mm:ss</strong> (24-hour).
                    </p>
                  </div>

                  <div className="mt-4 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
                    <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-100 mb-1">
                      Live scores stream (SSE)
                    </p>
                    <p className="text-xs text-cyan-800 dark:text-cyan-200 mb-2">
                      Alert thresholds for the live stream metrics panel are stored in the database (
                      <code className="text-[10px]">api_settings</code>) and apply to every admin. Run migration{' '}
                      <code className="text-[10px]">074_stream_alert_thresholds</code> once, then edit values on Fixtures.
                    </p>
                    <Link
                      href="/admin/fixtures"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:underline"
                    >
                      Open Fixtures — Live stream metrics
                      <span aria-hidden>→</span>
                    </Link>
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Minimum ROI Card */}
                <div className="rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] shadow-sm p-4 sm:p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Minimum ROI</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Human tipsters need this ROI% to list paid picks. AI tipsters use the same bar for automatic paid
                    listings when <strong>AI pick price</strong> is greater than zero.
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <Input
                      id="admin-min-roi"
                      type="number"
                      min="0"
                      max="1000"
                      step="0.1"
                      value={minimumROI}
                      onChange={(e) => setMinimumROI(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-gray-600 dark:text-gray-400 font-medium shrink-0">%</span>
                  </div>
                  <button type="button"
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
                          alert(getApiErrorMessage(error, 'Failed to update minimum ROI'));
                        }
                      } catch (e: any) {
                        alert(e.message || 'Failed to update minimum ROI');
                      } finally {
                        setSavingROI(false);
                      }
                    }}
                    disabled={savingROI}
                    className={buttonClassName({ fullWidth: true })}
                  >
                    {savingROI ? 'Saving...' : 'Save Minimum ROI'}
                  </button>
                </div>

                {/* Minimum win rate (paid marketplace) */}
                <div className="rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] shadow-sm p-4 sm:p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Minimum win rate</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Human tipsters need this settled win rate for paid marketplace picks. AI tipsters use the same
                    thresholds for auto-priced picks. If either metric is below the minimum, only free listings apply
                    until both recover.
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <Input
                      id="admin-min-winrate"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={minimumWinRate}
                      onChange={(e) => setMinimumWinRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    />
                    <span className="text-gray-600 dark:text-gray-400 font-medium shrink-0">%</span>
                  </div>
                  <button type="button"
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      if (!token) return;
                      setSavingWinRate(true);
                      try {
                        const res = await fetch(`${getApiUrl()}/admin/settings/minimum-win-rate`, {
                          method: 'PATCH',
                          headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ minimumWinRate }),
                        });
                        if (res.ok) {
                          alert('Minimum win rate updated successfully');
                          const settingsRes = await fetch(`${getApiUrl()}/admin/settings`, {
                            headers: { Authorization: `Bearer ${token}` },
                            cache: 'no-store',
                          });
                          if (settingsRes.ok) {
                            const data = await settingsRes.json();
                            setSettings(data);
                            if (data.minimumWinRate !== undefined) setMinimumWinRate(data.minimumWinRate);
                          }
                        } else {
                          const error = await res.json().catch(() => ({}));
                          alert(getApiErrorMessage(error, 'Failed to update minimum win rate'));
                        }
                      } catch (e: unknown) {
                        alert(e instanceof Error ? e.message : 'Failed to update minimum win rate');
                      } finally {
                        setSavingWinRate(false);
                      }
                    }}
                    disabled={savingWinRate}
                    className={buttonClassName({ fullWidth: true })}
                  >
                    {savingWinRate ? 'Saving...' : 'Save minimum win rate'}
                  </button>
                </div>

                {/* AI marketplace pick price */}
                <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] p-4 sm:p-6 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">AI pick price</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    When an AI tipster’s <strong>ROI</strong> and <strong>win rate</strong> (on their profile / leaderboard)
                    meet the minimum ROI and minimum win rate above, new prediction syncs list at this price on the
                    marketplace with the same escrow rules as human paid picks. Set to <strong>0</strong> to keep all AI
                    picks free.
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-gray-600 dark:text-gray-400 font-medium shrink-0">GHS</span>
                    <Input
                      id="admin-ai-price"
                      type="number"
                      min="0"
                      max="10000"
                      step="0.01"
                      value={aiMarketplaceCouponPrice}
                      onChange={(e) =>
                        setAiMarketplaceCouponPrice(Math.min(10000, Math.max(0, parseFloat(e.target.value) || 0)))
                      }
                    />
                  </div>
                  <button type="button"
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      if (!token) return;
                      setSavingAiCouponPrice(true);
                      try {
                        const res = await fetch(`${getApiUrl()}/admin/settings/ai-marketplace-coupon-price`, {
                          method: 'PATCH',
                          headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ aiMarketplaceCouponPrice }),
                        });
                        if (res.ok) {
                          alert('AI pick price updated successfully');
                          const settingsRes = await fetch(`${getApiUrl()}/admin/settings`, {
                            headers: { Authorization: `Bearer ${token}` },
                            cache: 'no-store',
                          });
                          if (settingsRes.ok) {
                            const data = await settingsRes.json();
                            setSettings(data);
                            if (data.aiMarketplaceCouponPrice !== undefined) {
                              setAiMarketplaceCouponPrice(data.aiMarketplaceCouponPrice);
                            }
                          }
                        } else {
                          const error = await res.json().catch(() => ({}));
                          alert(getApiErrorMessage(error, 'Failed to update AI pick price'));
                        }
                      } catch (e: unknown) {
                        alert(e instanceof Error ? e.message : 'Failed to update AI pick price');
                      } finally {
                        setSavingAiCouponPrice(false);
                      }
                    }}
                    disabled={savingAiCouponPrice}
                    className={buttonClassName({ fullWidth: true })}
                  >
                    {savingAiCouponPrice ? 'Saving...' : 'Save AI pick price'}
                  </button>
                </div>

                {/* AI tipsters: daily pick cap */}
                <div className="rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] shadow-sm p-4 sm:p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">AI tipsters — picks per day</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Maximum <strong>marketplace picks each AI tipster</strong> can publish per <strong>UTC calendar day</strong>{' '}
                    (scheduled run defaults to <strong>8:00 PM Africa/Accra</strong>; admins can also run manual generation in{' '}
                    <strong>Admin → AI predictions</strong>). The engine uses the <strong>lower</strong> of this value and each
                    tipster&apos;s own cap in server config (<code className="text-xs bg-white/60 dark:bg-gray-800 px-1 rounded">ai-tipsters.config.ts</code>
                    , <code className="text-xs bg-white/60 dark:bg-gray-800 px-1 rounded">max_daily_predictions</code>).
                    Default <strong>2</strong> keeps volume controlled.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-4 leading-relaxed">
                    How picks are built: same-day fixtures with odds from your DB; API-Football <strong>predictions</strong> endpoint
                    supplies probabilities per outcome when available; otherwise implied probability from decimal odds. Each AI profile
                    filters by <strong>min win probability</strong>, <strong>min expected value (EV)</strong>, optional{' '}
                    <strong>min API confidence</strong>, odds band, leagues, and bet types (see config). Does not change human tipster limits.
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <Input
                      id="admin-ai-max-day"
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      value={aiMaxCouponsPerDay}
                      onChange={(e) =>
                        setAiMaxCouponsPerDay(Math.min(50, Math.max(1, parseInt(e.target.value, 10) || 1)))
                      }
                    />
                    <span className="text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap shrink-0">/ tipster / day</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      if (!token) return;
                      setSavingAiMaxCoupons(true);
                      try {
                        const res = await fetch(`${getApiUrl()}/admin/settings/ai-max-coupons-per-day`, {
                          method: 'PATCH',
                          headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ aiMaxCouponsPerDay }),
                        });
                        if (res.ok) {
                          alert('AI daily pick limit updated');
                          const settingsRes = await fetch(`${getApiUrl()}/admin/settings`, {
                            headers: { Authorization: `Bearer ${token}` },
                            cache: 'no-store',
                          });
                          if (settingsRes.ok) {
                            const data = await settingsRes.json();
                            setSettings(data);
                            if (data.aiMaxCouponsPerDay !== undefined) setAiMaxCouponsPerDay(data.aiMaxCouponsPerDay);
                          }
                        } else {
                          const error = await res.json().catch(() => ({}));
                          alert(getApiErrorMessage(error, 'Failed to update AI limit'));
                        }
                      } catch (e: unknown) {
                        alert(e instanceof Error ? e.message : 'Failed to update AI limit');
                      } finally {
                        setSavingAiMaxCoupons(false);
                      }
                    }}
                    disabled={savingAiMaxCoupons}
                    className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                  >
                    {savingAiMaxCoupons ? 'Saving...' : 'Save AI daily limit'}
                  </button>
                </div>

                {/* Max picks per UTC day (anti-spam) */}
                <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] p-4 sm:p-6 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Human tipsters — picks per day</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Maximum picks a <strong>human</strong> tipster can create per UTC day. Use <strong>0</strong> for unlimited.
                    AI tipsters use the separate <strong>AI tipsters — picks per day</strong> setting above.
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <Input
                      id="admin-human-max-day"
                      type="number"
                      min="0"
                      max="500"
                      step="1"
                      value={maxCouponsPerDay}
                      onChange={(e) => setMaxCouponsPerDay(Math.min(500, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                    />
                    <span className="text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap shrink-0">/ day</span>
                  </div>
                  <button type="button"
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      if (!token) return;
                      setSavingCouponLimit(true);
                      try {
                        const res = await fetch(`${getApiUrl()}/admin/settings/max-coupons-per-day`, {
                          method: 'PATCH',
                          headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ maxCouponsPerDay }),
                        });
                        if (res.ok) {
                          alert('Daily pick limit updated successfully');
                          const settingsRes = await fetch(`${getApiUrl()}/admin/settings`, {
                            headers: { Authorization: `Bearer ${token}` },
                            cache: 'no-store',
                          });
                          if (settingsRes.ok) {
                            const data = await settingsRes.json();
                            setSettings(data);
                            if (data.maxCouponsPerDay !== undefined) setMaxCouponsPerDay(data.maxCouponsPerDay);
                          }
                        } else {
                          const error = await res.json().catch(() => ({}));
                          alert(getApiErrorMessage(error, 'Failed to update daily limit'));
                        }
                      } catch (e: unknown) {
                        alert(e instanceof Error ? e.message : 'Failed to update daily limit');
                      } finally {
                        setSavingCouponLimit(false);
                      }
                    }}
                    disabled={savingCouponLimit}
                    className={buttonClassName({ fullWidth: true })}
                  >
                    {savingCouponLimit ? 'Saving...' : 'Save daily limit'}
                  </button>
                </div>

                {/* Acca Generator limits */}
                <div className="rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] shadow-sm p-4 sm:p-6 sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Acca Generator</h3>
                    <div className="flex items-center gap-3">
                      <a
                        href="/admin/analytics?tab=acca"
                        className="text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                      >
                        Usage analytics →
                      </a>
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">/acca-generator</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Controls the user Acca Generator tool (separate from AI tipsters). These values are saved here — not via .env.
                    Max legs can go up to <strong>{accaLegsCeiling}</strong> for heavy match-day analysis, then set it back lower for normal users.
                    Use <strong>0</strong> daily generations for unlimited.
                  </p>
                  <label className="flex items-center gap-2 mb-4 text-sm text-gray-800 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={accaEnabled}
                      onChange={(e) => setAccaEnabled(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Feature enabled
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3 mb-4">
                    <Input
                      id="acca-min-legs"
                      label="Min legs"
                      type="number"
                      min={ACCA_GENERATOR_LEGS_MIN}
                      max={accaLegsCeiling}
                      value={accaMinLegs}
                      onChange={(e) =>
                        setAccaMinLegs(
                          Math.min(
                            accaLegsCeiling,
                            Math.max(ACCA_GENERATOR_LEGS_MIN, parseInt(e.target.value, 10) || ACCA_GENERATOR_LEGS_MIN),
                          ),
                        )
                      }
                    />
                    <Input
                      id="acca-max-legs"
                      label="Max legs"
                      type="number"
                      min={ACCA_GENERATOR_LEGS_MIN}
                      max={accaLegsCeiling}
                      value={accaMaxLegs}
                      onChange={(e) =>
                        setAccaMaxLegs(
                          Math.min(
                            accaLegsCeiling,
                            Math.max(ACCA_GENERATOR_LEGS_MIN, parseInt(e.target.value, 10) || ACCA_GENERATOR_LEGS_MIN),
                          ),
                        )
                      }
                    />
                    <Input
                      id="acca-daily-gens"
                      label="Generations / UTC day"
                      type="number"
                      min={0}
                      max={500}
                      value={accaDailyGenerations}
                      onChange={(e) => setAccaDailyGenerations(Math.min(500, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      if (!token) return;
                      setSavingAccaGenerator(true);
                      try {
                        const res = await fetch(`${getApiUrl()}/admin/settings/acca-generator`, {
                          method: 'PATCH',
                          headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            enabled: accaEnabled,
                            minLegs: accaMinLegs,
                            maxLegs: accaMaxLegs,
                            dailyGenerations: accaDailyGenerations,
                          }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setAccaEnabled(data.enabled !== false);
                          setAccaMinLegs(data.minLegs);
                          setAccaMaxLegs(data.maxLegs);
                          setAccaDailyGenerations(data.dailyGenerations);
                          if (typeof data.legsCeiling === 'number') setAccaLegsCeiling(data.legsCeiling);
                          alert('Acca Generator settings updated');
                        } else {
                          const error = await res.json().catch(() => ({}));
                          alert(getApiErrorMessage(error, 'Failed to update Acca Generator settings'));
                        }
                      } catch (e: unknown) {
                        alert(e instanceof Error ? e.message : 'Failed to update Acca Generator settings');
                      } finally {
                        setSavingAccaGenerator(false);
                      }
                    }}
                    disabled={savingAccaGenerator}
                    className={buttonClassName({ fullWidth: true })}
                  >
                    {savingAccaGenerator ? 'Saving...' : 'Save Acca Generator settings'}
                  </button>
                </div>

                {/* Platform Commission Rate Card */}
                <div className="rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] shadow-sm p-4 sm:p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Platform Commission</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    % deducted from tipster payouts when a winning pick is settled via escrow.
                  </p>
                  {/* Live preview */}
                  <div className="bg-amber-100/60 dark:bg-amber-900/30 rounded-xl p-3 mb-4 text-xs space-y-1">
                    <p className="font-semibold text-amber-800 dark:text-amber-200">Example payout (GHS 100 escrow)</p>
                    <p className="text-gray-600 dark:text-gray-400">Platform fee ({commissionRate}%): <span className="font-bold text-amber-700 dark:text-amber-300">GHS {(100 * commissionRate / 100).toFixed(2)}</span></p>
                    <p className="text-gray-600 dark:text-gray-400">Tipster receives: <span className="font-bold text-emerald-600">GHS {(100 - 100 * commissionRate / 100).toFixed(2)}</span></p>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <Input
                      id="admin-commission"
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Math.min(50, Math.max(0, parseFloat(e.target.value) || 0)))}
                    />
                    <span className="text-gray-600 dark:text-gray-400 font-medium shrink-0">%</span>
                  </div>
                  <button type="button"
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
                          alert(getApiErrorMessage(error, 'Failed to update commission rate'));
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
                <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] p-4 sm:p-6 transition-colors">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-[var(--primary)] rounded-xl text-white">
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
                <div className="rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] shadow-sm p-4 sm:p-6">
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
                <div className="rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] shadow-sm p-4 sm:p-6">
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
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-500 rounded-lg text-white flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About Platform Settings</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    Currency, country, and app name come from backend environment configuration and are not edited here.
                    Acca Generator, commission, AI limits, and similar cards on this page are saved with their own buttons.
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
