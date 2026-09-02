'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { AdSlot } from '@/components/AdSlot';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useLanguage, useT } from '@/context/LanguageContext';
import {
  withdrawalStatusLabelKey,
  walletWithdrawalStatusBadgeClass,
} from '@/lib/withdrawal-status';
import type { BalanceResponse } from '@betrollover/shared-types';
import { useCurrency } from '@/context/CurrencyContext';
import { useToast } from '@/hooks/useToast';
import { PENDING_WITHDRAWALS_INVALIDATE } from '@/hooks/usePendingWithdrawalCount';
import { SuccessToast } from '@/components/SuccessToast';
import { EscrowTrustCallout } from '@/components/EscrowTrustCallout';
import { PullToRefresh } from '@/components/ios/PullToRefresh';
import { GroupedListSection } from '@/components/ios/GroupedList';
import { SegmentedControl } from '@/components/ios/SegmentedControl';
import { Button, buttonClassName } from '@/components/ui/Button';
import { Input, Field, fieldControlClassName } from '@/components/ui/Input';
import { OUTCOME_TEXT, RESULT_SURFACE } from '@/lib/result-chip';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  reference?: string | null;
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
  /** Present from API when column exists — shows last status change */
  updatedAt?: string;
}

type DepositCallbackState = 'success' | 'failed' | 'cancelled' | 'incomplete';

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const { lang } = useLanguage();
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';
  const { format, currency } = useCurrency();
  const { showSuccess, clearSuccess, success: toastSuccess } = useToast();
  const [user, setUser] = useState<{ role: string; emailVerifiedAt?: string | null } | null>(null);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    provider: 'MTN',
    accountNumber: '',
    bankName: '',
    cryptoCurrency: 'USDT',
    network: 'TRC20',
    walletAddress: '',
  });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [depositCallbackState, setDepositCallbackState] = useState<DepositCallbackState | null>(null);
  const [depositContinuePath, setDepositContinuePath] = useState<string | null>(null);
  const [handledDepositRef, setHandledDepositRef] = useState<string | null>(null);
  const [walletTab, setWalletTab] = useState<'deposit' | 'withdraw'>('deposit');
  const continuePathFromQuery = searchParams.get('continue');
  const buildResumePath = useCallback((nextPath: string): string => {
    const isSubscriptionsCheckout = nextPath.startsWith('/subscriptions/checkout');
    if (isSubscriptionsCheckout) {
      return nextPath.includes('?')
        ? `${nextPath}&autoSubscribe=1&autoAttemptId=${Date.now()}`
        : `${nextPath}?autoSubscribe=1&autoAttemptId=${Date.now()}`;
    }
    return nextPath.includes('?')
      ? `${nextPath}&autoAttemptId=${Date.now()}`
      : `${nextPath}?autoAttemptId=${Date.now()}`;
  }, []);


  const normalizeInternalPath = (value: string | null): string | null => {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
    try {
      const parsed = new URL(value, 'http://localhost');
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  };

  const loadData = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const apiUrl = getApiUrl();
    setLoadError(null);
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
        setLoadError(t('common.error'));
        setBalance({ balance: 0, currency: 'GHS' });
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router, loadData]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#withdraw') {
      setWalletTab('withdraw');
    }
  }, []);

  // Persist a post-top-up return path for seamless checkout continuation.
  useEffect(() => {
    const normalized = normalizeInternalPath(continuePathFromQuery);
    if (!normalized) return;
    sessionStorage.setItem('wallet.afterTopupContinue', normalized);
  }, [continuePathFromQuery]);

  // Handle callback from Paystack: verify deposit (credits if webhook hasn't fired) then refresh
  useEffect(() => {
    const deposit = searchParams.get('deposit');
    const depositState = deposit?.toLowerCase();
    const storedContinuePath = normalizeInternalPath(sessionStorage.getItem('wallet.afterTopupContinue'));
    if (storedContinuePath) {
      setDepositContinuePath(storedContinuePath);
    }
    if (depositState === 'cancelled' || depositState === 'failed') {
      setDepositCallbackState(depositState);
      setDepositError(null);
      return;
    }
    const ref = searchParams.get('ref');
    if (depositState === 'success' && !ref) {
      setDepositCallbackState('incomplete');
      return;
    }
    if (depositState === 'success' && ref && handledDepositRef !== ref) {
      setHandledDepositRef(ref);
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${getApiUrl()}/wallet/deposit/verify?ref=${encodeURIComponent(ref)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .finally(() => loadData());
      }
      setDepositCallbackState('success');
    }
  }, [searchParams, loadData, t, handledDepositRef]);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 1 || amount > 10000) {
      setDepositError(t('wallet.deposit_range'));
      return;
    }
    setDepositCallbackState(null);
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
      if (!res.ok) throw new Error(getApiErrorMessage(data, t('wallet.init_failed')));
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
        throw new Error(getApiErrorMessage(data, 'Withdrawal failed'));
      }
      setWithdrawAmount('');
      const okMsg = getApiErrorMessage(data, t('wallet.withdrawal_request_success'));
      showSuccess(okMsg);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(PENDING_WITHDRAWALS_INVALIDATE));
      }
      loadData();
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : t('wallet.withdrawal_failed'));
    } finally {
      setWithdrawLoading(false);
    }
  };

  const emptyPayoutForm = {
    type: 'mobile_money' as const,
    name: '',
    phone: '',
    provider: 'MTN',
    accountNumber: '',
    bankName: '',
    cryptoCurrency: 'USDT',
    network: 'TRC20',
    walletAddress: '',
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
      if (!payoutForm.name.trim() || !payoutForm.walletAddress.trim()) {
        setPayoutError(t('wallet.wallet_address_required'));
        return;
      }
    }
    setPayoutError(null);
    setPayoutLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setPayoutLoading(false);
      return;
    }
    try {
      const body =
        payoutForm.type === 'mobile_money'
          ? {
              type: 'mobile_money' as const,
              name: payoutForm.name,
              phone: payoutForm.phone,
              provider: payoutForm.provider,
              country: 'GH',
              currency: 'GHS',
            }
          : payoutForm.type === 'bank'
            ? {
                type: 'bank' as const,
                name: payoutForm.name,
                accountNumber: payoutForm.accountNumber,
                bankName: payoutForm.bankName,
                country: 'GH',
                currency: 'GHS',
              }
            : {
                type: 'crypto' as const,
                name: payoutForm.name,
                walletAddress: payoutForm.walletAddress,
                cryptoCurrency: payoutForm.cryptoCurrency,
                network: payoutForm.network,
                country: 'GH',
                currency: 'GHS',
              };
      const res = await fetch(`${getApiUrl()}/wallet/payout-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(getApiErrorMessage(data, t('wallet.failed_add_payout')));
      setShowPayoutForm(false);
      setPayoutForm(emptyPayoutForm);
      loadData();
    } catch (e) {
      setPayoutError(e instanceof Error ? e.message : t('wallet.failed'));
    } finally {
      setPayoutLoading(false);
    }
  };

  const canWithdraw =
    user && (user.role === 'tipster' || user.role === 'admin' || user.role === 'user');
  const momoInstantPayout = balance?.paystackTransfersEnabled === true;
  const withdrawSectionTitle =
    user?.role === 'tipster' ? t('wallet.withdraw_earnings') : t('wallet.withdraw_funds');
  const pendingWithdrawal = withdrawals.find((w) => w.status === 'pending' || w.status === 'processing');

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateTime(s: string) {
    return new Date(s).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <DashboardShell>
      <div className="min-h-[calc(100vh-8rem)] w-full min-w-0 max-w-full bg-[var(--bg)]">
        <PullToRefresh onRefresh={() => { loadData(); }} disabled={loading}>
        <div className="section-ux-dashboard-shell min-w-0 max-w-full">
          <PageHeader
            label={t('wallet.title')}
            title={t('wallet.title')}
            tagline={t('wallet.tagline')}
          />

          <EscrowTrustCallout
            className="mb-4"
            title={t('wallet.trust_callout_title')}
            body={t('wallet.trust_callout_body')}
            linkLabel={t('home.how_it_works')}
          />

          <div className="mb-4">
            <AdSlot zoneSlug="wallet-full" fullWidth className="w-full" />
          </div>

          {!loading && user && !user.emailVerifiedAt && (
            <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-light)] p-4 text-[var(--text)]">
              <p className="font-medium">{t('wallet.verify_email')}</p>
              <Link href="/verify-email" className="mt-2 inline-block text-sm underline hover:no-underline">
                {t('wallet.resend_verify')}
              </Link>
            </div>
          )}

          {!loading && loadError && (
            <div className="rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive-light)] p-4 text-[var(--destructive)]">
              <p className="text-sm font-medium">{loadError}</p>
              <button
                type="button"
                onClick={loadData}
                className="mt-2 text-sm underline hover:no-underline"
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {loading && <LoadingSkeleton count={2} variant="list" />}
          {!loading && (
            <div className="space-y-4 pb-6 min-w-0 max-w-full">
              <div className="ios-grouped-section p-4 min-w-0">
                <p className="text-xs text-[var(--text-muted)] mb-0.5 font-medium uppercase tracking-wide">{t('wallet.balance')}</p>
              <p className="text-xl sm:text-2xl font-semibold text-[var(--primary)]">
                {format(Number(balance?.balance ?? 0)).primary}
              </p>
              {currency.code !== 'GHS' && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  GHS {Number(balance?.balance ?? 0).toFixed(2)} · {t('wallet.for_reference_only')}
                </p>
              )}
              {canWithdraw ? (
                <div className="mt-4">
                  <SegmentedControl
                    aria-label={t('wallet.money_board')}
                    options={[
                      { value: 'deposit' as const, label: t('wallet.tab_add') },
                      { value: 'withdraw' as const, label: t('wallet.tab_cash_out') },
                    ]}
                    value={walletTab}
                    onChange={setWalletTab}
                  />
                </div>
              ) : null}
              {(!canWithdraw || walletTab === 'deposit') && (
              <div className="mt-3 space-y-2">
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  step={0.01}
                  placeholder={t('wallet.amount_placeholder')}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  error={depositError || undefined}
                />
                <Button
                  type="button"
                  onClick={handleDeposit}
                  disabled={depositLoading}
                  fullWidth
                  size="lg"
                >
                  {depositLoading ? t('wallet.redirecting') : t('wallet.deposit')}
                </Button>
              </div>
              )}
            </div>

            {depositCallbackState && walletTab === 'deposit' && (
              <div
                className={`rounded-2xl border p-4 ${
                  depositCallbackState === 'success'
                    ? `${RESULT_SURFACE.won} text-[var(--success)]`
                    : 'border-[var(--accent)]/30 bg-[var(--accent-light)] text-[var(--accent)]'
                }`}
              >
                <p className="text-sm font-medium">
                  {depositCallbackState === 'success'
                    ? t('wallet.deposit_callback_success')
                    : depositCallbackState === 'cancelled'
                      ? t('wallet.deposit_callback_cancelled')
                      : depositCallbackState === 'failed'
                        ? t('wallet.deposit_callback_failed')
                        : t('wallet.deposit_callback_incomplete')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(depositCallbackState === 'failed' || depositCallbackState === 'cancelled' || depositCallbackState === 'incomplete') && (
                    <button
                      type="button"
                      onClick={() => setDepositCallbackState(null)}
                      className="px-3 py-1.5 rounded-lg border border-current/30 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {t('wallet.deposit_retry')}
                    </button>
                  )}
                  {depositContinuePath && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = buildResumePath(depositContinuePath);
                        sessionStorage.removeItem('wallet.afterTopupContinue');
                        setDepositCallbackState(null);
                        router.push(next);
                      }}
                      className={buttonClassName({ size: 'sm' })}
                    >
                      {t('wallet.deposit_return_to_checkout')}
                    </button>
                  )}
                  <Link
                    href="/support"
                    className="px-3 py-1.5 rounded-lg border border-current/30 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    {t('wallet.deposit_contact_support')}
                  </Link>
                </div>
              </div>
            )}

            {canWithdraw && walletTab === 'withdraw' && (
              <div id="withdraw" className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm scroll-mt-[calc(var(--br-chrome-below-header)+1rem)] min-w-0">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{withdrawSectionTitle}</h2>

                {/* Pending withdrawal warning */}
                {pendingWithdrawal && (
                  <div className="mb-3 p-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-light)] text-[var(--text)] text-sm flex items-start gap-2">
                    <div className="space-y-1">
                      <p>
                        <span className="font-semibold">{t('wallet.withdrawal_in_progress')}</span>
                        {(pendingWithdrawal.currency ?? 'GHS')} {Number(pendingWithdrawal.amount).toFixed(2)}
                        {' — '}
                        <span className="font-medium">{t(withdrawalStatusLabelKey(pendingWithdrawal.status))}</span>
                        . {t('wallet.withdrawal_notify_hint')}
                      </p>
                      <Link href="/notifications" className="text-xs underline opacity-90 hover:opacity-100">
                        {t('wallet.view_notifications_link')}
                      </Link>
                    </div>
                  </div>
                )}

                {showPayoutForm ? (
                  <div className="space-y-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                        <Field label={t('wallet.payout_method')} htmlFor="wallet-payout-type">
                          <select
                            id="wallet-payout-type"
                            value={payoutForm.type}
                            onChange={(e) => setPayoutForm((p) => ({ ...p, type: e.target.value as 'mobile_money' | 'bank' | 'crypto' }))}
                            className={fieldControlClassName()}
                          >
                            <option value="mobile_money">{t('wallet.mobile_money')}</option>
                            <option value="bank">{t('wallet.bank_account')}</option>
                            <option value="crypto">{t('wallet.cryptocurrency')}</option>
                          </select>
                        </Field>
                        <p className="text-xs text-[var(--text-muted)] -mt-1">
                          {payoutForm.type === 'mobile_money'
                            ? t(momoInstantPayout ? 'wallet.payout_momo_hint' : 'wallet.payout_momo_hint_manual')
                            : payoutForm.type === 'bank'
                              ? t('wallet.payout_bank_hint')
                              : t('wallet.payout_crypto_hint')}
                        </p>
                        <Input
                          label={t('wallet.account_holder')}
                          placeholder={t('wallet.account_holder')}
                          value={payoutForm.name}
                          onChange={(e) => setPayoutForm((p) => ({ ...p, name: e.target.value }))}
                        />
                        {payoutForm.type === 'mobile_money' && (
                          <>
                            <Input
                              type="tel"
                              placeholder="0551234567"
                              value={payoutForm.phone}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, phone: e.target.value }))}
                              autoComplete="tel"
                            />
                            <Field htmlFor="wallet-payout-provider">
                              <select
                                id="wallet-payout-provider"
                                value={payoutForm.provider}
                                onChange={(e) => setPayoutForm((p) => ({ ...p, provider: e.target.value }))}
                                className={fieldControlClassName()}
                              >
                                <option value="MTN">MTN Mobile Money</option>
                                <option value="VOD">Telecel (Vodafone) Cash</option>
                                <option value="ATL">AirtelTigo Money</option>
                              </select>
                            </Field>
                          </>
                        )}
                        {payoutForm.type === 'bank' && (
                          <>
                            <Input
                              placeholder="Bank name"
                              value={payoutForm.bankName}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, bankName: e.target.value }))}
                            />
                            <Input
                              placeholder="Account number"
                              value={payoutForm.accountNumber}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, accountNumber: e.target.value }))}
                              inputMode="numeric"
                            />
                          </>
                        )}
                        {payoutForm.type === 'crypto' && (
                          <>
                            <Field label={t('wallet.crypto_asset')} htmlFor="wallet-payout-asset">
                              <select
                                id="wallet-payout-asset"
                                value={payoutForm.cryptoCurrency}
                                onChange={(e) => setPayoutForm((p) => ({ ...p, cryptoCurrency: e.target.value }))}
                                className={fieldControlClassName()}
                              >
                                <option value="USDT">USDT</option>
                                <option value="USDC">USDC</option>
                              </select>
                            </Field>
                            <Field label={t('wallet.crypto_network')} htmlFor="wallet-payout-network">
                              <select
                                id="wallet-payout-network"
                                value={payoutForm.network}
                                onChange={(e) => setPayoutForm((p) => ({ ...p, network: e.target.value }))}
                                className={fieldControlClassName()}
                              >
                                <option value="TRC20">TRC20 (Tron)</option>
                                <option value="ERC20">ERC20 (Ethereum)</option>
                                <option value="BEP20">BEP20 (BNB Chain)</option>
                              </select>
                            </Field>
                            <Input
                              label={t('wallet.wallet_address')}
                              placeholder={
                                payoutForm.network === 'TRC20'
                                  ? 'T…'
                                  : '0x…'
                              }
                              value={payoutForm.walletAddress}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, walletAddress: e.target.value }))}
                              autoComplete="off"
                              spellCheck={false}
                            />
                          </>
                        )}
                        {payoutError && <p className="text-sm text-[var(--destructive)]">{payoutError}</p>}
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                          <Button
                            type="button"
                            onClick={handleAddPayoutMethod}
                            disabled={payoutLoading}
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            {payoutLoading ? t('wallet.saving') : t('wallet.save')}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowPayoutForm(false)}
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            {t('wallet.cancel')}
                          </Button>
                        </div>
                  </div>
                ) : payoutMethods.length === 0 ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowPayoutForm(true)}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-muted)]"
                    >
                      {t('wallet.add_payout_method')}
                    </button>
                    <p className="text-xs text-[var(--text-muted)]">
                      {t(momoInstantPayout ? 'wallet.payout_methods_available' : 'wallet.payout_methods_available_manual')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[var(--text-muted)] mb-0.5">{t('wallet.payout_method')}</p>
                        <p className="text-sm text-[var(--text)] font-medium break-words">
                          {payoutMethods[0].displayName}
                          {payoutMethods[0].accountMasked && <span className="text-[var(--text-muted)]"> · {payoutMethods[0].accountMasked}</span>}
                          <span className="ml-1 text-xs text-[var(--text-muted)]">
                            {payoutMethods[0].type === 'mobile_money' ? `· ${t('wallet.mobile_money')}`
                              : payoutMethods[0].type === 'bank' ? `· ${t('wallet.bank_account')}`
                              : payoutMethods[0].type === 'crypto' ? `· ${t('wallet.cryptocurrency')}`
                              : ''}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPayoutForm(true)}
                        className="self-start sm:self-auto shrink-0 text-xs text-[var(--primary)] hover:underline whitespace-nowrap"
                      >
                        {t('wallet.replace')}
                      </button>
                    </div>
                    <div className="relative min-w-0">
                      <Input
                        id="wallet-withdraw-amount"
                        type="number"
                        min={5}
                        max={5000}
                        step={0.01}
                        placeholder={t('wallet.amount_min')}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        disabled={!!pendingWithdrawal}
                        className="pr-24"
                        aria-label={t('wallet.amount')}
                      />
                      {balance && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] pointer-events-none">
                          {t('wallet.max', { value: Number(balance.balance).toFixed(2) })}
                        </span>
                      )}
                    </div>
                    {withdrawError && <p className="text-sm text-[var(--destructive)]">{withdrawError}</p>}
                    <Button
                      type="button"
                      fullWidth
                      onClick={handleWithdraw}
                      disabled={withdrawLoading || !!pendingWithdrawal}
                    >
                      {withdrawLoading ? t('wallet.processing') : pendingWithdrawal ? t('wallet.withdrawal_pending') : t('wallet.request_withdrawal')}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Withdrawal history — anyone who can withdraw */}
            {canWithdraw && walletTab === 'withdraw' && withdrawals.length > 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm min-w-0">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('wallet.withdrawal_history')}</h2>
                <ul className="space-y-2">
                  {withdrawals.slice(0, 8).map((w) => {
                    const statusLabel = t(withdrawalStatusLabelKey(w.status));
                    const showUpdated =
                      w.updatedAt &&
                      w.updatedAt !== w.createdAt &&
                      new Date(w.updatedAt).getTime() !== new Date(w.createdAt).getTime();
                    const reasonTitle =
                      w.status === 'rejected'
                        ? t('wallet.rejection_reason')
                        : w.status === 'failed'
                          ? t('wallet.failure_reason')
                          : null;
                    return (
                      <li key={w.id} className="flex flex-col gap-2 py-3 border-b border-[var(--border)] last:border-0">
                        <div className="flex items-start justify-between gap-3 min-w-0">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--text)] tabular-nums">
                              {w.currency ?? 'GHS'} {Number(w.amount).toFixed(2)}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {formatDate(w.createdAt)}
                              {w.reference && <span className="ml-1 font-mono opacity-60">· {w.reference.slice(0, 12)}</span>}
                            </p>
                            {showUpdated && (
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                {t('wallet.withdrawal_updated')}: {formatDateTime(w.updatedAt!)}
                              </p>
                            )}
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${walletWithdrawalStatusBadgeClass(w.status)}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        {w.failureReason && (w.status === 'rejected' || w.status === 'failed') && (
                          <div
                            className={`rounded-xl border px-3 py-2 text-sm ${
                              w.status === 'rejected'
                                ? 'border-[var(--accent)]/40 bg-[var(--accent-light)] text-[var(--accent)]'
                                : 'border-[var(--destructive)]/40 bg-[var(--destructive-light)] text-[var(--destructive)]'
                            }`}
                          >
                            {reasonTitle && (
                              <p className="text-[10px] font-bold uppercase tracking-wide opacity-90 mb-1">{reasonTitle}</p>
                            )}
                            <p className="leading-relaxed break-words">{w.failureReason}</p>
                          </div>
                        )}
                        {w.failureReason && w.status !== 'rejected' && w.status !== 'failed' && (
                          <p className="text-xs text-[var(--text-muted)] break-words">{w.failureReason}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <GroupedListSection title={t('wallet.recent_transactions')} className="min-w-0">
              <div className="flex justify-end px-4 pt-2">
                <Link href="/earnings" className="text-xs text-[var(--primary)] hover:underline">{t('wallet.full_earnings')}</Link>
              </div>
              {transactions.length === 0 ? (
                <p className="px-4 py-6 text-[var(--text-muted)] text-sm">{t('wallet.no_transactions')}</p>
              ) : (
                <ul className="divide-y divide-[var(--separator)]">
                  {transactions.map((tx) => {
                    const isRealCommission = tx.type === 'commission' && (tx.reference?.startsWith('commission-') ?? false);
                    const isMisclassifiedCredit = tx.type === 'commission' && !isRealCommission && Number(tx.amount) > 0;
                    const isCommission = isRealCommission;
                    const isCredit = ['payout','deposit','refund','credit'].includes(tx.type) || isMisclassifiedCredit;
                    const displayType = isMisclassifiedCredit ? 'credit' : tx.type;
                    const TX_LABEL: Record<string, string> = { payout: t('wallet.net_payout'), commission: t('wallet.commission'), refund: t('wallet.refund'), deposit: t('wallet.deposit'), withdrawal: t('wallet.withdrawal'), purchase: t('wallet.purchase'), credit: t('wallet.credit'), adjustment: t('wallet.adjustment') };
                    const refundFromPick = displayType === 'refund' && (tx.reference?.startsWith('pick-') ?? false);
                    return (
                      <li key={tx.id} className={`ios-list-row flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 px-4 py-3 ${isCommission ? 'opacity-70' : ''}`}>
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="text-xs font-semibold w-8 text-center shrink-0 pt-0.5 text-[var(--primary)]">{displayType.slice(0, 3).toUpperCase()}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-[var(--text)]">{refundFromPick ? t('wallet.refund_pick') : (TX_LABEL[displayType] ?? displayType)}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{tx.description || new Date(tx.createdAt).toLocaleDateString(locale, { day:'numeric', month:'short' })}</p>
                            {refundFromPick ? (
                              <Link href="/my-purchases" className="text-[10px] text-[var(--primary)] hover:underline">
                                {t('my_purchases.title')}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right shrink-0 sm:ml-auto pl-9 sm:pl-0 tabular-nums">
                          <span className={`font-semibold text-sm tabular-nums block ${isCommission ? 'text-[var(--accent)]' : isCredit ? OUTCOME_TEXT.positive : OUTCOME_TEXT.negative}`}>
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
              {transactions.some(tx => tx.type === 'commission' && (tx.reference?.startsWith('commission-') ?? false)) && (
                <p className="text-[10px] text-[var(--text-muted)] mx-4 mb-3 pt-2 border-t border-[var(--separator)]">
                  {t('wallet.platform_fee_note')}
                  <Link href="/earnings" className="ml-1 text-[var(--primary)] hover:underline">{t('wallet.view_full_breakdown')}</Link>
                </p>
              )}
            </GroupedListSection>
          </div>
        )}
        </div>
        </PullToRefresh>
      </div>
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
    </DashboardShell>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={
      <DashboardShell>
        <div className="section-ux-dashboard-shell min-w-0 max-w-full">
          <LoadingSkeleton count={2} variant="list" />
        </div>
      </DashboardShell>
    }>
      <WalletContent />
    </Suspense>
  );
}
