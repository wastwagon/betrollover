'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

interface GenerationLog {
  id: number;
  log_date: string;
  status: string;
  predictions_generated: number;
  fixtures_analyzed: number;
  api_requests_used: number;
  errors: string | null;
  execution_time_seconds: number;
  source: string;
  created_at: string;
}

interface Prediction {
  id: number;
  prediction_title: string;
  combined_odds: number;
  stake_units: number;
  confidence_level: string;
  status: string;
  username: string;
  display_name: string;
  avatar_url: string;
  posted_at?: string;
  marketplace_price?: number;
}

function formatPostedAt(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function AdminAiPredictionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [todayPredictions, setTodayPredictions] = useState<Prediction[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSyncToMarketplace = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/admin/predictions/sync-to-marketplace`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const msg = data.errors?.length
          ? `Synced ${data.synced} to marketplace. ${data.skipped} skipped: ${data.errors.slice(0, 3).join('; ')}`
          : `Synced ${data.synced} predictions to marketplace.`;
        setMessage({ type: data.synced > 0 ? 'success' : 'error', text: msg });
        if (data.synced > 0) await loadData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to sync' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to sync' });
    } finally {
      setSyncing(false);
    }
  };

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);
    try {
      const [logsRes, predictionsRes] = await Promise.all([
        fetch(`${API_URL}/admin/predictions/generation-logs?limit=10`, { headers }),
        fetch(`${API_URL}/admin/predictions/today`, { headers }),
      ]);
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }
      if (predictionsRes.ok) {
        const data = await predictionsRes.json();
        setTodayPredictions(data.predictions || []);
      }
    } catch (e) {
      console.error('AI Predictions load error:', e);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/admin/predictions/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.count !== undefined) {
        setMessage({ type: 'success', text: data.message || `Generated ${data.count} predictions` });
        await loadData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to generate predictions' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to generate predictions' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Predictions</h1>
          <p className="text-gray-600 dark:text-gray-400">Generate and manage AI tipster predictions from fixtures in the next 7 days.</p>
        </div>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl ${
              message.type === 'success'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Generate Button */}
        <div className="mb-8">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <span>🤖</span>
                Generate Predictions
              </>
            )}
          </button>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Runs automatically at 9 AM and 11 AM (catch-up). Check sync status in Settings.
          </p>
        </div>

        {/* Sync to Marketplace */}
        <div className="mb-8">
          <button
            onClick={handleSyncToMarketplace}
            disabled={syncing}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            {syncing ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <span>📤</span>
                Sync Predictions to Marketplace
              </>
            )}
          </button>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Sync existing predictions to the marketplace (free by default). Run setup/ai-tipsters first if tipsters have no user link.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Latest Predictions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Latest Predictions</h2>
              {todayPredictions.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 py-4">No predictions yet. Fixtures are drawn from the next 7 days.</p>
              ) : (
                <div className="space-y-3">
                  {todayPredictions.slice(0, 10).map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <Link
                        href="/marketplace"
                        className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                      >
                        <p className="font-medium text-gray-900 dark:text-white truncate">{p.prediction_title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {p.username} · {p.combined_odds.toFixed(2)} odds
                          {p.posted_at && (
                            <span className="ml-2 text-xs">· Posted {formatPostedAt(p.posted_at)}</span>
                          )}
                        </p>
                      </Link>
                      <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Free
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generation Logs */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generation Logs</h2>
              {logs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 py-4">No generation logs yet.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(log.log_date).toLocaleDateString()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            log.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                              : log.status === 'partial'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {log.predictions_generated} predictions · {log.fixtures_analyzed} fixtures · {log.execution_time_seconds}s
                      </p>
                      {log.errors && (
                        <p className="text-red-600 dark:text-red-400 mt-1 text-xs">{log.errors}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/admin/analytics?tab=ai"
            className="text-red-600 dark:text-red-400 hover:underline font-medium"
          >
            → View AI Analytics Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
