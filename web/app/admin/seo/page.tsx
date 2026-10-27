'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';
import { Button } from '@/components/ui/Button';

type GscProbeRow = {
  id: string;
  label: string;
  url: string;
  layer: 'public' | 'api';
  ok: boolean;
  status: number | null;
  durationMs: number;
  robotsAllowed: boolean | null;
  indexable: boolean | null;
  detail?: string;
};

type GscIndexingContext = {
  classicAiHiddenFromPublic: boolean;
  sitemapUrlCount: number | null;
  sitemapFetchError?: string;
  sitemapPolicy: {
    couponMax: number;
    matchMax: number;
    newsMax: number;
    deepLinksEnglishOnly: boolean;
  };
};

type GscHealthReport = {
  checkedAt: string;
  siteOrigin: string;
  summary: { total: number; ok: number; failed: number };
  probes: GscProbeRow[];
  indexing?: GscIndexingContext;
};

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        ok ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
      }`}
    >
      {ok ? 'OK' : 'Issue'}
    </span>
  );
}

export default function AdminSeoPage() {
  const router = useRouter();
  const [report, setReport] = useState<GscHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setError(null);
    if (refresh) setRunning(true);
    else setLoading(true);
    try {
      const q = refresh ? '?refresh=1' : '';
      const res = await fetch(`${getApiUrl()}/admin/seo/gsc-health${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError('Could not load GSC health report');
        return;
      }
      setReport(await res.json());
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    load(false);
  }, [router, load]);

  const publicProbes = report?.probes.filter((p) => p.layer === 'public') ?? [];
  const apiProbes = report?.probes.filter((p) => p.layer === 'api') ?? [];

  return (
    <div className="flex min-h-screen w-full min-w-0">
      <AdminSidebar />
      <main className="flex-1 min-w-0 p-4 md:p-8 max-w-5xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">SEO / GSC health</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Probes public URLs as Googlebot and checks API paths that caused Search Console 5xx / robots reports.
            </p>
          </div>
          <Button type="button" disabled={running} onClick={() => load(true)}>
            {running ? 'Running…' : 'Run check now'}
          </Button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}

        {loading && !report ? (
          <p className="text-[var(--text-muted)]">Loading last check…</p>
        ) : report ? (
          <>
            {report.indexing ? (
              <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-5">
                <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Indexing &amp; sitemap</h2>
                <dl className="grid gap-2 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-[var(--text-muted)]">Live sitemap URLs</dt>
                    <dd className="font-medium text-[var(--text)]">
                      {report.indexing.sitemapUrlCount != null
                        ? report.indexing.sitemapUrlCount.toLocaleString()
                        : report.indexing.sitemapFetchError ?? 'Unknown'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">Classic AI hidden from public API</dt>
                    <dd className="font-medium text-[var(--text)]">
                      {report.indexing.classicAiHiddenFromPublic ? (
                        <span className="text-amber-700 dark:text-amber-300">Yes — set HIDE_CLASSIC_AI_TIPSTERS_FROM_PUBLIC=false</span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-300">No (profiles indexable)</span>
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[var(--text-muted)]">Sitemap deep-link caps (English only)</dt>
                    <dd className="text-[var(--text)]">
                      ≤{report.indexing.sitemapPolicy.couponMax} coupons · ≤{report.indexing.sitemapPolicy.matchMax}{' '}
                      matches · ≤{report.indexing.sitemapPolicy.newsMax} news · FR hubs still listed
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)] space-y-2 leading-relaxed">
                  <p>
                    <strong className="text-[var(--text)]">Discovered – currently not indexed (~18k):</strong> mostly
                    old coupon/injury URLs Google learned from a previous large sitemap. Last crawled &quot;N/A&quot; means
                    queued, not broken. After deploy, resubmit sitemap.xml; the count drops over weeks — you do not need 0
                    to mark Done fixing.
                  </p>
                  <p>
                    <strong className="text-[var(--text)]">Crawled – currently not indexed (~37):</strong> Google crawled
                    but chose not to index (long-tail / FR mirrors). Request indexing for tier‑1 URLs only: home,
                    marketplace, buy-football-tips, acca-generator, desk tipsters.
                  </p>
                  <p>
                    <strong className="text-[var(--text)]">Enhancements → Events:</strong> comes from{' '}
                    <code className="text-[11px]">SportsEvent</code> JSON-LD on <code className="text-[11px]">/matches/*</code>.
                    The probe below checks one sitemap match URL for <code className="text-[11px]">startDate</code>,{' '}
                    <code className="text-[11px]">location.address</code>, and no nested league Event. After deploy, validate
                    in GSC Events report.
                  </p>
                  <p>
                    <a
                      href="https://search.google.com/search-console"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--primary)] hover:underline"
                    >
                      Open Search Console
                    </a>
                  </p>
                </div>
              </section>
            ) : null}

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-xs text-[var(--text-muted)]">Last checked</p>
                <p className="text-sm font-medium text-[var(--text)]">
                  {new Date(report.checkedAt).toLocaleString()}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{report.siteOrigin}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-xs text-[var(--text-muted)]">Passing</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{report.summary.ok}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-xs text-[var(--text-muted)]">Issues</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{report.summary.failed}</p>
              </div>
            </div>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-3">Public pages (Googlebot)</h2>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-muted)] text-left text-[var(--text-muted)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Check</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Robots</th>
                      <th className="px-3 py-2 font-medium">Indexable</th>
                      <th className="px-3 py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publicProbes.map((p) => (
                      <tr key={p.id} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2">
                          <div className="font-medium text-[var(--text)]">{p.label}</div>
                          <Link href={p.url} className="text-xs text-[var(--primary)] hover:underline break-all">
                            {p.url}
                          </Link>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <StatusBadge ok={p.ok} />
                          <span className="ml-2 text-[var(--text-muted)]">{p.status ?? '—'}</span>
                        </td>
                        <td className="px-3 py-2">
                          {p.robotsAllowed == null ? '—' : p.robotsAllowed ? 'Allowed' : 'Blocked'}
                        </td>
                        <td className="px-3 py-2">
                          {p.indexable == null ? '—' : p.indexable ? 'Yes' : 'noindex'}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-muted)]">{p.detail ?? `${p.durationMs} ms`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[var(--text)] mb-3">API layer (5xx prevention)</h2>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-muted)] text-left text-[var(--text-muted)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Check</th>
                      <th className="px-3 py-2 font-medium">Result</th>
                      <th className="px-3 py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiProbes.map((p) => (
                      <tr key={p.id} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 font-medium text-[var(--text)]">{p.label}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <StatusBadge ok={p.ok} />
                          <span className="ml-2 text-[var(--text-muted)]">{p.status ?? '—'}</span>
                        </td>
                        <td className="px-3 py-2 text-[var(--text-muted)]">{p.detail ?? `${p.durationMs} ms`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="mt-6 text-xs text-[var(--text-muted)]">
              Scheduled check runs daily at 06:15 UTC; failures are logged server-side and admins get an in-app notification.
              After fixes, use Google Search Console → Validate fix on the affected reports.
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}
