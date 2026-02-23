'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { AdSlot } from '@/components/AdSlot';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import type { BalanceResponse } from '@betrollover/shared-types';
import { useCurrency } from '@/context/CurrencyContext';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  createdAt: string;
}

interface PayoutMethod {
  id: number;
  type: string;
  displayName: string;
  accountMasked: string | null;
  country?: string | null;
  currency?: string | null;
  provider?: string | null;
}

interface Withdrawal {
  id: number;
  amount: number;
  currency?: string;
  status: string;
  reference?: string | null;
  failureReason?: string | null;
  createdAt: string;
}

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const { format, currency } = useCurrency();
  const [user, setUser] = useState<{ role: string; emailVerifiedAt?: string | null } | null>(null);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    type: 'mobile_money' as 'mobile_money' | 'bank' | 'crypto',
    name: '',
    phone: '',
    provider: 'mtn_gh',
    accountNumber: '',
    bankName: '',
    country: 'GH',
    currency: 'GHS',
    walletAddress: '',
    cryptoCurrency: 'BTC',
  });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const loadData = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const apiUrl = getApiUrl();
    Promise.all([
      fetch(`${apiUrl}/users/me`, { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${apiUrl}/wallet/balance`, { headers }).then((r) => r.ok ? r.json() : null),
      fetch(`${apiUrl}/wallet/transactions`, { headers }).then((r) => r.ok ? r.json() : []),
      fetch(`${apiUrl}/wallet/payout-methods`, { headers }).then((r) => r.ok ? r.json() : []),
      fetch(`${apiUrl}/wallet/withdrawals`, { headers }).then((r) => r.ok ? r.json() : []),
    ])
      .then(([u, bal, txs, payouts, wdrs]) => {
        setUser(u);
        setBalance(bal || { balance: 0, currency: 'GHS' });
        setTransactions(Array.isArray(txs) ? txs : []);
        setPayoutMethods(Array.isArray(payouts) ? payouts : []);
        setWithdrawals(Array.isArray(wdrs) ? wdrs : []);
      })
      .catch(() => {
        setBalance({ balance: 0, currency: 'GHS' });
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  // Handle callback from Paystack: verify deposit (credits if webhook hasn't fired) then refresh
  useEffect(() => {
    const deposit = searchParams.get('deposit');
    const ref = searchParams.get('ref');
    if (deposit === 'success' && ref) {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${getApiUrl()}/wallet/deposit/verify?ref=${encodeURIComponent(ref)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .finally(() => loadData());
      }
      router.replace('/wallet', { scroll: false });
    }
  }, [searchParams]);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 1 || amount > 10000) {
      setDepositError(t('wallet.deposit_range'));
      return;
    }
    setDepositError(null);
    setDepositLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch(`${getApiUrl()}/wallet/deposit/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('wallet.init_failed'));
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setDepositError(t('wallet.could_not_get_link'));
      }
    } catch (e) {
      setDepositError(e instanceof Error ? e.message : t('wallet.deposit_failed'));
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 5 || amount > 5000) {
      setWithdrawError(t('wallet.withdraw_range'));
      return;
    }
    setWithdrawError(null);
    setWithdrawLoading(true);
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${getApiUrl()}/wallet/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.message || 'Withdrawal failed';
        if (msg.toLowerCase().includes('starter business') || msg.toLowerCase().includes('third party payout')) {
          msg += ' Use "Change" to switch to Manual payout (admin processes withdrawals) or upgrade your Paystack account.';
        }
        throw new Error(msg);
      }
      setWithdrawAmount('');
      loadData();
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : t('wallet.withdrawal_failed'));
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleAddPayoutMethod = async () => {
    if (payoutForm.type === 'mobile_money') {
      if (!payoutForm.name.trim() || !payoutForm.phone.trim()) {
        setPayoutError(t('wallet.name_phone_required'));
        return;
      }
    } else if (payoutForm.type === 'bank') {
      if (!payoutForm.name.trim() || !payoutForm.accountNumber.trim() || !payoutForm.bankName.trim()) {
        setPayoutError(t('wallet.name_account_bank_required'));
        return;
      }
    } else if (payoutForm.type === 'crypto') {
      if (!payoutForm.walletAddress.trim()) {
        setPayoutError(t('wallet.wallet_address_required'));
        return;
      }
    }
    setPayoutError(null);
    setPayoutLoading(true);
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      let body: Record<string, unknown>;
      if (payoutForm.type === 'crypto') {
        body = {
          type: 'crypto',
          name: payoutForm.name || `${payoutForm.cryptoCurrency} Wallet`,
          walletAddress: payoutForm.walletAddress.trim(),
          cryptoCurrency: payoutForm.cryptoCurrency,
        };
      } else if (payoutForm.type === 'mobile_money') {
        body = {
          type: 'mobile_money',
          name: payoutForm.name,
          phone: payoutForm.phone,
          provider: payoutForm.provider,
          country: payoutForm.country,
          currency: payoutForm.currency,
        };
      } else {
        body = {
          type: 'bank',
          name: payoutForm.name,
          accountNumber: payoutForm.accountNumber,
          bankName: payoutForm.bankName,
          country: payoutForm.country,
          currency: payoutForm.currency,
        };
      }
      const res = await fetch(`${getApiUrl()}/wallet/payout-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('wallet.failed_add_payout'));
      setShowPayoutForm(false);
      setPayoutForm({
        type: 'mobile_money',
        name: '',
        phone: '',
        provider: 'mtn_gh',
        accountNumber: '',
        bankName: '',
        country: 'GH',
        currency: 'GHS',
        walletAddress: '',
        cryptoCurrency: 'BTC',
      });
      loadData();
    } catch (e) {
      setPayoutError(e instanceof Error ? e.message : t('wallet.failed'));
    } finally {
      setPayoutLoading(false);
    }
  };

  const isTipster = user?.role === 'tipster' || user?.role === 'admin';
  const pendingWithdrawal = withdrawals.find((w) => w.status === 'pending' || w.status === 'processing');

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const STATUS_STYLES: Record<string, string> = {
    completed:  'text-emerald-600',
    pending:    'text-amber-500',
    processing: 'text-blue-500',
    failed:     'text-red-500',
    cancelled:  'text-slate-400',
  };

  return (
    <DashboardShell>
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <PageHeader
            label={t('wallet.title')}
            title={t('wallet.title')}
            tagline={t('wallet.tagline')}
          />

          <div className="mb-4">
            <AdSlot zoneSlug="wallet-full" fullWidth className="w-full" />
          </div>

          {!loading && user && !user.emailVerifiedAt && (
            <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
              <p className="font-medium">{t('wallet.verify_email')}</p>
              <Link href="/verify-email" className="mt-2 inline-block text-sm underline hover:no-underline">
                {t('wallet.resend_verify')}
              </Link>
            </div>
          )}

          {loading && <LoadingSkeleton count={2} variant="list" />}
          {!loading && (
            <div className="space-y-4 pb-6">
              <div className="card-gradient rounded-2xl p-5 shadow-lg">
                <p className="text-xs text-[var(--text-muted)] mb-0.5 font-medium uppercase tracking-wider">{t('wallet.balance')}</p>
              <p className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">
                {format(Number(balance?.balance ?? 0)).primary}
              </p>
              {currency.code !== 'GHS' && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  GHS {Number(balance?.balance ?? 0).toFixed(2)} · {t('wallet.for_reference_only')}
                </p>
              )}
              <div className="mt-3 space-y-2">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  step={0.01}
                  placeholder={t('wallet.amount_placeholder')}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                />
                {depositError && <p className="text-sm text-red-500">{depositError}</p>}
                <button
                  onClick={handleDeposit}
                  disabled={depositLoading}
                  className="w-full px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white hover:shadow-lg hover:shadow-[var(--primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {depositLoading ? t('wallet.redirecting') : t('wallet.deposit')}
                </button>
              </div>
            </div>

            {isTipster && (
              <div id="withdraw" className="card-gradient rounded-2xl p-5 shadow-lg scroll-mt-24">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('wallet.withdraw_earnings')}</h2>

                {/* Pending withdrawal warning */}
                {pendingWithdrawal && (
                  <div className="mb-3 p-3 rounded-xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-sm flex items-start gap-2">
                    <span className="text-base">⏳</span>
                    <div>
                      <span className="font-semibold">Withdrawal in progress — </span>
                      {(pendingWithdrawal.currency ?? 'GHS')} {Number(pendingWithdrawal.amount).toFixed(2)} is{' '}
                      <span className="font-medium">{pendingWithdrawal.status}</span>. Please wait for it to complete before requesting another.
                    </div>
                  </div>
                )}

                {showPayoutForm ? (
                  <div className="space-y-2 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                        <label className="block text-xs font-medium text-[var(--text-muted)]">Payout method</label>
                        <select
                          value={payoutForm.type}
                          onChange={(e) => setPayoutForm((p) => ({ ...p, type: e.target.value as 'mobile_money' | 'bank' | 'crypto' }))}
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                        >
                          <option value="mobile_money">Mobile Money</option>
                          <option value="bank">Bank Account</option>
                          <option value="crypto">Cryptocurrency</option>
                        </select>
                        <input
                          placeholder="Account holder name"
                          value={payoutForm.name}
                          onChange={(e) => setPayoutForm((p) => ({ ...p, name: e.target.value }))}
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                        />
                        {payoutForm.type === 'mobile_money' && (
                          <>
                            <select
                              value={payoutForm.country}
                              onChange={(e) => {
                                const c = e.target.value;
                                const cur: Record<string, string> = { GH: 'GHS', NG: 'NGN', KE: 'KES', ZA: 'ZAR', OTHER: 'USD' };
                                setPayoutForm((p) => ({ ...p, country: c, currency: cur[c] || 'USD' }));
                              }}
                              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                            >
                              <option value="GH">Ghana</option>
                              <option value="NG">Nigeria</option>
                              <option value="KE">Kenya</option>
                              <option value="ZA">South Africa</option>
                              <option value="OTHER">Other</option>
                            </select>
                            <input
                              placeholder="Phone (e.g. 0551234567)"
                              value={payoutForm.phone}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, phone: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                            />
                            {payoutForm.country === 'GH' ? (
                              <select
                                value={payoutForm.provider}
                                onChange={(e) => setPayoutForm((p) => ({ ...p, provider: e.target.value }))}
                                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                              >
                                <option value="mtn_gh">MTN Mobile Money</option>
                                <option value="vodafone_gh">Vodafone Cash</option>
                                <option value="airteltigo_gh">AirtelTigo Money</option>
                              </select>
                            ) : (
                              <select
                                value={payoutForm.currency}
                                onChange={(e) => setPayoutForm((p) => ({ ...p, currency: e.target.value }))}
                                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                              >
                                <option value="GHS">GHS</option>
                                <option value="NGN">NGN</option>
                                <option value="KES">KES</option>
                                <option value="ZAR">ZAR</option>
                                <option value="USD">USD</option>
                              </select>
                            )}
                          </>
                        )}
                        {payoutForm.type === 'bank' && (
                          <>
                            <select
                              value={payoutForm.country}
                              onChange={(e) => {
                                const c = e.target.value;
                                const cur: Record<string, string> = { GH: 'GHS', NG: 'NGN', KE: 'KES', ZA: 'ZAR', OTHER: 'USD' };
                                setPayoutForm((p) => ({ ...p, country: c, currency: cur[c] || 'USD' }));
                              }}
                              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                            >
                              <option value="GH">Ghana</option>
                              <option value="NG">Nigeria</option>
                              <option value="KE">Kenya</option>
                              <option value="ZA">South Africa</option>
                              <option value="OTHER">Other</option>
                            </select>
                            <select
                              value={payoutForm.currency}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, currency: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                            >
                              <option value="GHS">GHS</option>
                              <option value="NGN">NGN</option>
                              <option value="KES">KES</option>
                              <option value="ZAR">ZAR</option>
                              <option value="USD">USD</option>
                            </select>
                            <input
                              placeholder="Bank name"
                              value={payoutForm.bankName}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, bankName: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                            />
                            <input
                              placeholder="Account number"
                              value={payoutForm.accountNumber}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, accountNumber: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                            />
                          </>
                        )}
                        {payoutForm.type === 'crypto' && (
                          <>
                            <select
                              value={payoutForm.cryptoCurrency}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, cryptoCurrency: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                            >
                              <option value="BTC">Bitcoin (BTC)</option>
                              <option value="ETH">Ethereum (ETH)</option>
                              <option value="USDT">Tether (USDT)</option>
                              <option value="USDC">USD Coin (USDC)</option>
                              <option value="BNB">BNB</option>
                              <option value="LTC">Litecoin (LTC)</option>
                              <option value="XRP">XRP</option>
                              <option value="TRX">TRON (TRX)</option>
                            </select>
                            <input
                              placeholder="Wallet address"
                              value={payoutForm.walletAddress}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, walletAddress: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] font-mono text-sm"
                            />
                          </>
                        )}
                        {payoutError && <p className="text-sm text-red-500">{payoutError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddPayoutMethod}
                            disabled={payoutLoading}
                            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white disabled:opacity-50"
                          >
                            {payoutLoading ? t('wallet.saving') : t('wallet.save')}
                          </button>
                          <button
                            onClick={() => setShowPayoutForm(false)}
                            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)]"
                          >
                            {t('wallet.cancel')}
                          </button>
                        </div>
                  </div>
                ) : payoutMethods.length === 0 ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowPayoutForm(true)}
                      className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-muted)]"
                    >
                      {t('wallet.add_payout_method')}
                    </button>
                    <p className="text-xs text-[var(--text-muted)]">
                      Mobile Money · Bank Account · Cryptocurrency (global)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-muted)] mb-0.5">Payout method</p>
                        <p className="text-sm text-[var(--text)] font-medium">
                          {payoutMethods[0].displayName}
                          {payoutMethods[0].accountMasked && <span className="text-[var(--text-muted)]"> · {payoutMethods[0].accountMasked}</span>}
                          <span className="ml-1 text-xs text-[var(--text-muted)]">
                            {payoutMethods[0].type === 'mobile_money' ? '· Mobile Money'
                              : payoutMethods[0].type === 'bank' ? '· Bank'
                              : payoutMethods[0].type === 'crypto' ? '· Crypto'
                              : ''}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPayoutForm(true)}
                        className="text-xs text-[var(--primary)] hover:underline whitespace-nowrap"
                      >
                        {t('wallet.replace')}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={5}
                        max={5000}
                        step={0.01}
                        placeholder={t('wallet.amount_min')}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        disabled={!!pendingWithdrawal}
                        className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] disabled:opacity-50"
                      />
                      {balance && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] pointer-events-none">
                          {t('wallet.max', { value: Number(balance.balance).toFixed(2) })}
                        </span>
                      )}
                    </div>
                    {withdrawError && <p className="text-sm text-red-500">{withdrawError}</p>}
                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawLoading || !!pendingWithdrawal}
                      className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {withdrawLoading ? t('wallet.processing') : pendingWithdrawal ? t('wallet.withdrawal_pending') : t('wallet.request_withdrawal')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Withdrawal history — always visible for tipsters */}
            {isTipster && withdrawals.length > 0 && (
              <div className="card-gradient rounded-2xl p-5 shadow-lg">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('wallet.withdrawal_history')}</h2>
                <ul className="space-y-2">
                  {withdrawals.slice(0, 8).map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text)]">
                          {w.currency ?? 'GHS'} {Number(w.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {formatDate(w.createdAt)}
                          {w.reference && <span className="ml-1 font-mono opacity-60">· {w.reference.slice(0, 12)}</span>}
                        </p>
                        {w.failureReason && (
                          <p className="text-xs text-red-500 mt-0.5">{w.failureReason}</p>
                        )}
                      </div>
                      <span className={`text-sm font-semibold capitalize ${STATUS_STYLES[w.status] ?? 'text-[var(--text-muted)]'}`}>
                        {w.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="card-gradient rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{t('wallet.recent_transactions')}</h2>
                <Link href="/earnings" className="text-xs text-[var(--primary)] hover:underline">{t('wallet.full_earnings')}</Link>
              </div>
              {transactions.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm">{t('wallet.no_transactions')}</p>
              ) : (
                <ul className="space-y-1">
                  {transactions.map((tx) => {
                    const isCommission = tx.type === 'commission';
                    const isCredit = ['payout','deposit','refund','credit'].includes(tx.type);
                    const TX_ICON: Record<string, string> = { payout:'💰', commission:'🏛', refund:'↩', deposit:'⬆', withdrawal:'💸', purchase:'🛒', credit:'✨' };
                    const TX_LABEL: Record<string, string> = { payout: t('wallet.net_payout'), commission: t('wallet.commission'), refund: t('wallet.refund'), deposit: t('wallet.deposit'), withdrawal: t('wallet.withdrawal'), purchase: t('wallet.purchase'), credit: t('wallet.credit') };
                    return (
                      <li key={tx.id} className={`flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0 ${isCommission ? 'opacity-70' : ''}`}>
                        <span className="text-base w-6 text-center flex-shrink-0">{TX_ICON[tx.type] ?? '↔'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-[var(--text)]">{TX_LABEL[tx.type] ?? tx.type}</p>
                          <p className="text-xs text-[var(--text-muted)] truncate">{tx.description || new Date(tx.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`font-semibold text-sm tabular-nums block ${isCommission ? 'text-amber-600' : isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                            {isCommission ? '−' : isCredit ? '+' : '−'}{format(Math.abs(Number(tx.amount))).primary}
                          </span>
                          {currency.code !== 'GHS' && (
                            <span className="text-[10px] text-[var(--text-muted)]">GHS {Math.abs(Number(tx.amount)).toFixed(2)}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {transactions.some(tx => tx.type === 'commission') && (
                <p className="text-[10px] text-[var(--text-muted)] mt-3 pt-2 border-t border-[var(--border)]">
                  {t('wallet.platform_fee_note')}
                  <Link href="/earnings" className="ml-1 text-amber-600 hover:underline">{t('wallet.view_full_breakdown')}</Link>
                </p>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardShell>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={
      <DashboardShell>
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <LoadingSkeleton count={2} variant="list" />
        </div>
      </DashboardShell>
    }>
      <WalletContent />
    </Suspense>
  );
}
