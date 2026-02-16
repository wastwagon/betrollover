'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

interface EscrowFund {
  id: number;
  userId: number;
  pickId: number;
  amount: number;
  status: string;
  reference: string;
  createdAt: string;
}

export default function AdminEscrowPage() {
  const router = useRouter();
  const [funds, setFunds] = useState<EscrowFund[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch(`${API_URL}/admin/escrow`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFunds(Array.isArray(data) ? data : []))
      .catch(() => setFunds([]))
      .finally(() => setLoading(false));
  }, [router]);

  const held = funds.filter((f) => f.status === 'held');
  const totalHeld = held.reduce((a, f) => a + Number(f.amount), 0);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Escrow Funds</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Funds held until picks settle. Released to tipster on win, refunded on loss.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-2xl shadow-lg border-l-4 border-amber-500 p-6">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">Total Held</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">GHS {totalHeld.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl shadow-lg border-l-4 border-blue-500 p-6">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Active Holdings</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{held.length}</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading escrow funds...</p>
            </div>
          </div>
        )}
        {!loading && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {funds.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No escrow funds</h3>
                <p className="text-gray-600 dark:text-gray-400">No funds are currently held in escrow.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">User ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Pick ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {funds.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{f.userId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{f.pickId}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">GHS {Number(f.amount).toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            f.status === 'held' 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' 
                              : f.status === 'released'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {f.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {new Date(f.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
