'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

interface Wallet {
  id: number;
  userId: number;
  balance: number;
  currency: string;
  status: string;
  user?: { id: number; email: string; displayName: string };
}

interface Transaction {
  id: number;
  userId: number;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  createdAt: string;
}

export default function AdminWalletPage() {
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tab, setTab] = useState<'wallets' | 'transactions'>('wallets');
  const [loading, setLoading] = useState(true);
  const [adjustingWallet, setAdjustingWallet] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (tab === 'wallets') {
      setLoading(true);
      fetch(`${API_URL}/admin/wallets`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setWallets(Array.isArray(data) ? data : []))
        .catch(() => setWallets([]))
        .finally(() => setLoading(false));
    } else {
      setLoading(true);
      fetch(`${API_URL}/admin/wallet-transactions?limit=50`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setTransactions(Array.isArray(data) ? data : []))
        .catch(() => setTransactions([]))
        .finally(() => setLoading(false));
    }
  }, [router, tab]);

  const totalBalance = wallets.reduce((a, w) => a + Number(w.balance), 0);

  const adjustBalance = async (userId: number) => {
    if (!adjustAmount || !adjustReason) {
      alert('Please enter amount and reason');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API_URL}/admin/wallets/${userId}/adjust`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(adjustAmount), reason: adjustReason }),
    });
    if (res.ok) {
      alert('Balance adjusted successfully');
      setAdjustingWallet(null);
      setAdjustAmount('');
      setAdjustReason('');
      // Reload wallets
      fetch(`${API_URL}/admin/wallets`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setWallets(Array.isArray(data) ? data : []));
    } else {
      alert('Failed to adjust balance');
    }
  };

  const freezeWallet = async (userId: number, freeze: boolean) => {
    if (!confirm(`${freeze ? 'Freeze' : 'Unfreeze'} this wallet?`)) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API_URL}/admin/wallets/${userId}/freeze`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ freeze }),
    });
    if (res.ok) {
      // Reload wallets
      fetch(`${API_URL}/admin/wallets`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setWallets(Array.isArray(data) ? data : []));
    } else {
      alert('Failed to update wallet status');
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Wallet Management</h1>
          <p className="text-gray-600 dark:text-gray-400">View wallets and transaction history.</p>
        </div>

        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setTab('wallets')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              tab === 'wallets' 
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg' 
                : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Wallets
          </button>
          <button
            onClick={() => setTab('transactions')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              tab === 'transactions' 
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg' 
                : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Transactions
          </button>
        </div>

        {tab === 'wallets' && (
          <>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
              <p className="text-sm opacity-90 mb-1">Total Platform Balance</p>
              <p className="text-3xl font-bold">GHS {totalBalance.toFixed(2)}</p>
            </div>

            {adjustingWallet !== null && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Adjust Wallet Balance</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount (positive to add, negative to deduct)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="e.g., 100 or -50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason</label>
                    <input
                      type="text"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="e.g., Manual adjustment, Refund, etc."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => adjustBalance(adjustingWallet)}
                      className="px-6 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg"
                    >
                      Apply Adjustment
                    </button>
                    <button
                      onClick={() => {
                        setAdjustingWallet(null);
                        setAdjustAmount('');
                        setAdjustReason('');
                      }}
                      className="px-6 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            {loading && <p className="text-[var(--text-muted)]">Loading...</p>}
            {!loading && (
              <div className="bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] overflow-hidden">
                {wallets.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-6xl mb-4">💰</div>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">No wallets found</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-[var(--border)]">
                    <thead className="bg-gradient-to-r from-red-600 to-red-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {wallets.map((w) => (
                        <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900 dark:text-white">{w.user?.displayName || `User ${w.userId}`}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{w.user?.email || '-'}</p>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">GHS {Number(w.balance).toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              w.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : w.status === 'frozen'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setAdjustingWallet(w.userId)}
                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                              >
                                Adjust
                              </button>
                              <button
                                onClick={() => freezeWallet(w.userId, w.status !== 'frozen')}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                  w.status === 'frozen'
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                              >
                                {w.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'transactions' && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
              </div>
            )}
            {!loading && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {transactions.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-6xl mb-4">💸</div>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">No transactions found</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gradient-to-r from-red-600 to-red-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">User ID</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{t.userId}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{t.type}</span>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-semibold ${Number(t.amount) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {Number(t.amount) >= 0 ? '+' : ''}GHS {Math.abs(Number(t.amount)).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              t.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : t.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{t.description || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {new Date(t.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
