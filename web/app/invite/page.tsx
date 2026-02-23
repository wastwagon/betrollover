'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { AdSlot } from '@/components/AdSlot';
import { useT } from '@/context/LanguageContext';
import { getApiUrl } from '@/lib/site-config';

interface Conversion {
  id: number;
  referredUser: { displayName: string; username: string } | null;
  rewardAmount: number;
  rewardCredited: boolean;
  firstPurchaseAt: string | null;
  joinedAt: string;
}

interface ReferralStats {
  code: string;
  totalReferrals: number;
  totalCredited: number;
  rewardPerReferral: number;
  conversions: Conversion[];
}

function CopyButton({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} className="flex-shrink-0 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors">
      {copied ? t('invite.copied') : t('invite.copy')}
    </button>
  );
}

export default function InvitePage() {
  const router = useRouter();
  const t = useT();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login?redirect=/invite'); return; }
    try {
      const r = await fetch(`${getApiUrl()}/referrals/my`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setStats(await r.json());
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl  = stats ? `${origin}/register?ref=${stats.code}` : '';
  const shareText = stats
    ? `Join me on BetRollover — the AI-powered tipster marketplace! Use my referral code ${stats.code} when signing up. ${shareUrl}`
    : '';

  return (
    <DashboardShell>
      <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24 max-w-2xl mx-auto">

        <div className="mb-8">
          <p className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">{t('invite.grow_together')}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">{t('invite.invite_earn')}</h1>
          <p className="text-[var(--text-muted)] mt-1 text-sm">
            {t('invite.invite_desc', { amount: stats?.rewardPerReferral?.toFixed(2) ?? '5.00' })}
          </p>
        </div>

        <div className="mb-6">
          <AdSlot zoneSlug="invite-full" fullWidth className="w-full max-w-3xl" />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2].map((i) => <div key={i} className="h-24 rounded-2xl bg-[var(--card)] animate-pulse border border-[var(--border)]" />)}
          </div>
        ) : !stats ? (
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-8 text-center">
            <p className="text-[var(--text-muted)]">{t('invite.load_failed')}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t('invite.invites_sent'), value: stats.totalReferrals },
                { label: t('invite.reward_invite'), value: `GHS ${Number(stats.rewardPerReferral).toFixed(2)}` },
                { label: t('invite.total_credited'), value: `GHS ${Number(stats.totalCredited).toFixed(2)}` },
              ].map((c) => (
                <div key={c.label} className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 text-center shadow-sm">
                  <p className="text-xl font-bold text-[var(--text)]">{c.value}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 uppercase tracking-wide">{c.label}</p>
                </div>
              ))}
            </div>

            {/* Referral code */}
            <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">{t('invite.your_referral_code')}</p>
              <div className="flex items-center gap-3">
                <span className="flex-1 font-mono text-2xl font-bold text-[var(--primary)] tracking-widest">
                  {stats.code}
                </span>
                <CopyButton text={stats.code} />
              </div>
            </div>

            {/* Share link */}
            <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">{t('invite.share_link')}</p>
              <div className="flex items-center gap-3">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 rounded-xl text-sm bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] truncate focus:outline-none"
                />
                <CopyButton text={shareUrl} />
              </div>
            </div>

            {/* Share message */}
            <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{t('invite.share_message')}</p>
                <CopyButton text={shareText} />
              </div>
              <p className="text-sm text-[var(--text-muted)] bg-[var(--bg)] rounded-xl p-3 border border-[var(--border)] whitespace-pre-wrap">{shareText}</p>
            </div>

            {/* How it works */}
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 p-5">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-3">{t('invite.how_it_works')}</p>
              <div className="space-y-2">
                {[
                  ['1', t('invite.step1')],
                  ['2', t('invite.step2')],
                  ['3', t('invite.step3')],
                  ['4', t('invite.step4')],
                ].map(([step, text]) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center">{step}</span>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversions list */}
            {stats.conversions.length > 0 && (
              <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('invite.your_referrals')}</p>
                <div className="space-y-2">
                  {stats.conversions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">
                          {c.referredUser?.displayName ?? t('invite.user')}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {t('invite.joined')} {new Date(c.joinedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                          {c.firstPurchaseAt && ` · ${t('invite.purchased')} ${new Date(c.firstPurchaseAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}`}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${c.rewardCredited ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>
                        {c.rewardCredited ? `+GHS ${Number(c.rewardAmount).toFixed(2)}` : t('invite.pending')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </DashboardShell>
  );
}
