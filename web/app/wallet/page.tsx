'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { getApiUrl } from '@/lib/site-config';

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
}

interface Withdrawal {
  id: number;
  amount: number;
  status: string;
  createdAt: string;
}

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ role: string; emailVerifiedAt?: string | null } | null>(null);
  const [balance, setBalance] = useState<{ balance: number; currency: string } | null>(null);
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
    type: 'mobile_money' as 'mobile_money' | 'bank',
    name: '',
    phone: '',
    provider: 'mtn_gh',
    accountNumber: '',
    bankCode: '',
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
      setDepositError('Enter an amount between GHS 1 and GHS 10,000');
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
      if (!res.ok) throw new Error(data.message || 'Failed to initialize deposit');
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setDepositError('Could not get payment link');
      }
    } catch (e) {
      setDepositError(e instanceof Error ? e.message : 'Deposit failed');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 5 || amount > 5000) {
      setWithdrawError('Enter an amount between GHS 5 and GHS 5,000');
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
      if (!res.ok) throw new Error(data.message || 'Withdrawal failed');
      setWithdrawAmount('');
      loadData();
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleAddPayoutMethod = async () => {
    if (payoutForm.type === 'mobile_money') {
      if (!payoutForm.name.trim() || !payoutForm.phone.trim()) {
        setPayoutError('Name and phone required');
        return;
      }
    } else {
      if (!payoutForm.name.trim() || !payoutForm.accountNumber.trim() || !payoutForm.bankCode.trim()) {
        setPayoutError('Name, account number and bank code required');
        return;
      }
    }
    setPayoutError(null);
    setPayoutLoading(true);
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const body =
        payoutForm.type === 'mobile_money'
          ? { type: 'mobile_money', name: payoutForm.name, phone: payoutForm.phone, provider: payoutForm.provider }
          : { type: 'bank', name: payoutForm.name, accountNumber: payoutForm.accountNumber, bankCode: payoutForm.bankCode };
      const res = await fetch(`${getApiUrl()}/wallet/payout-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add payout method');
      setShowPayoutForm(false);
      setPayoutForm({ type: 'mobile_money', name: '', phone: '', provider: 'mtn_gh', accountNumber: '', bankCode: '' });
      loadData();
    } catch (e) {
      setPayoutError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPayoutLoading(false);
    }
  };

  const isTipster = user?.role === 'tipster' || user?.role === 'admin';

  return (
    <AppShell>
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <PageHeader
            label="Wallet"
            title="Wallet"
            tagline="Deposit, withdraw, and track transactions"
          />

          {!loading && user && !user.emailVerifiedAt && (
            <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
              <p className="font-medium">Verify your email to deposit, withdraw, or add payout methods.</p>
              <a href="/verify-email" className="mt-2 inline-block text-sm underline hover:no-underline">
                Resend verification email →
              </a>
            </div>
          )}

          {loading && <p className="text-[var(--text-muted)] text-sm">Loading...</p>}
          {!loading && (
            <div className="space-y-4 pb-6">
              <div className="card-gradient rounded-2xl p-5 shadow-lg">
                <p className="text-xs text-[var(--text-muted)] mb-0.5 font-medium uppercase tracking-wider">Available Balance</p>
              <p className="text-2xl sm:text-3xl font-bold text-[var(--primary)]">
                {balance?.currency} {Number(balance?.balance ?? 0).toFixed(2)}
              </p>
              <div className="mt-3 space-y-2">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  step={0.01}
                  placeholder="Amount (GHS)"
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
                  {depositLoading ? 'Redirecting...' : 'Deposit'}
                </button>
              </div>
            </div>

            {isTipster && (
              <div className="card-gradient rounded-2xl p-5 shadow-lg">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Withdraw (Tipsters)</h2>
                {payoutMethods.length === 0 ? (
                  <div className="space-y-3">
                    {!showPayoutForm ? (
                      <button
                        onClick={() => setShowPayoutForm(true)}
                        className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-muted)]"
                      >
                        Add payout method (Mobile Money or Bank)
                      </button>
                    ) : (
                      <div className="space-y-2 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                        <select
                          value={payoutForm.type}
                          onChange={(e) => setPayoutForm((p) => ({ ...p, type: e.target.value as 'mobile_money' | 'bank' }))}
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                        >
                          <option value="mobile_money">Mobile Money</option>
                          <option value="bank">Bank Account</option>
                        </select>
                        <input
                          placeholder="Account name"
                          value={payoutForm.name}
                          onChange={(e) => setPayoutForm((p) => ({ ...p, name: e.target.value }))}
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                        />
                        {payoutForm.type === 'mobile_money' ? (
                          <>
                            <input
                              placeholder="Phone (e.g. 0551234567)"
                              value={payoutForm.phone}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, phone: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                            />
                            <select
                              value={payoutForm.provider}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, provider: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                            >
                              <option value="mtn_gh">MTN</option>
                              <option value="vodafone_gh">Vodafone</option>
                              <option value="airteltigo_gh">AirtelTigo</option>
                            </select>
                          </>
                        ) : (
                          <>
                            <input
                              placeholder="Account number"
                              value={payoutForm.accountNumber}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, accountNumber: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                            />
                            <input
                              placeholder="Bank code (e.g. GHSBGHAC)"
                              value={payoutForm.bankCode}
                              onChange={(e) => setPayoutForm((p) => ({ ...p, bankCode: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
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
                            {payoutLoading ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setShowPayoutForm(false)}
                            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--text-muted)]">
                      Payout to: {payoutMethods[0].displayName} {payoutMethods[0].accountMasked && `(${payoutMethods[0].accountMasked})`}
                    </p>
                    <input
                      type="number"
                      min={5}
                      max={5000}
                      step={0.01}
                      placeholder="Amount (GHS)"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                    />
                    {withdrawError && <p className="text-sm text-red-500">{withdrawError}</p>}
                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawLoading}
                      className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50"
                    >
                      {withdrawLoading ? 'Processing...' : 'Withdraw'}
                    </button>
                    {withdrawals.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[var(--border)]">
                        <p className="text-sm font-medium text-[var(--text-muted)] mb-2">Recent withdrawals</p>
                        <ul className="space-y-1 text-sm">
                          {withdrawals.slice(0, 5).map((w) => (
                            <li key={w.id} className="flex justify-between">
                              <span>GHS {Number(w.amount).toFixed(2)}</span>
                              <span className={w.status === 'completed' ? 'text-emerald-600' : w.status === 'failed' ? 'text-red-500' : 'text-amber-500'}>
                                {w.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="card-gradient rounded-2xl p-5 shadow-lg">
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Recent Transactions</h2>
              {transactions.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm">No transactions yet.</p>
              ) : (
                <ul className="space-y-3">
                  {transactions.map((t) => (
                    <li key={t.id} className="flex justify-between items-center py-2 border-b border-[var(--border)] last:border-0">
                      <div>
                        <p className="font-medium text-sm">{t.type}</p>
                        <p className="text-xs text-[var(--text-muted)]">{t.description || new Date(t.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`font-medium ${Number(t.amount) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {Number(t.amount) >= 0 ? '+' : ''}GHS {Math.abs(Number(t.amount)).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </AppShell>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="dashboard-bg dashboard-pattern min-h-[200px] flex items-center justify-center">
          <p className="text-[var(--text-muted)] text-sm animate-pulse">Loading wallet...</p>
        </div>
      </AppShell>
    }>
      <WalletContent />
    </Suspense>
  );
}
