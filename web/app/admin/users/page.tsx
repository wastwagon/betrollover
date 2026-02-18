'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';

const API_URL = getApiUrl();

interface User {
  id: number;
  email: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  role: string;
  status: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);
  const [avatarUploading, setAvatarUploading] = useState<number | null>(null);
  const [tipsterRequests, setTipsterRequests] = useState<{ id: number; userId: number; user?: { displayName: string; email: string }; createdAt: string }[]>([]);

  const load = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    fetch(`${API_URL}/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { items: [], total: 0 }))
      .then((data) => {
        setUsers(data.items || []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    load();
  }, [router, page, search, roleFilter]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/admin/tipster-requests`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTipsterRequests(Array.isArray(data) ? data : []))
      .catch(() => setTipsterRequests([]));
  }, [updating]);

  const updateUser = async (id: number, data: { role?: string; status?: string }) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setUpdating(id);
    try {
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) load();
    } finally {
      setUpdating(null);
    }
  };

  const approveTipster = async (userId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setUpdating(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/approve-tipster`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        load();
        setTipsterRequests((prev) => prev.filter((r) => r.userId !== userId));
      }
    } finally {
      setUpdating(null);
    }
  };

  const uploadUserAvatar = async (userId: number, file: File) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setAvatarUploading(userId);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch(`${API_URL}/admin/users/${userId}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) load();
    } finally {
      setAvatarUploading(null);
    }
  };

  const rejectTipster = async (userId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setUpdating(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/reject-tipster`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTipsterRequests((prev) => prev.filter((r) => r.userId !== userId));
      }
    } finally {
      setUpdating(null);
    }
  };

  const [impersonating, setImpersonating] = useState<number | null>(null);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);

  const impersonateUser = async (userId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setImpersonateError(null);
    setImpersonating(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        // Full page redirect so app re-initializes with new token
        window.location.href = '/dashboard';
        return;
      }
      setImpersonateError(data.message || `Impersonation failed (${res.status})`);
    } catch (error) {
      console.error('Impersonation failed:', error);
      setImpersonateError('Network error. Try again.');
    } finally {
      setImpersonating(null);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Users</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage users, roles, and account status.</p>
        </div>

        {tipsterRequests.length > 0 && (
          <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-l-4 border-red-500 shadow-lg">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4 text-lg flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-sm font-bold">
                {tipsterRequests.length}
              </span>
              Tipster Requests
            </h2>
            <div className="space-y-3">
              {tipsterRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">{r.user?.displayName ?? 'User'}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">{r.user?.email}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveTipster(r.userId)}
                      disabled={updating === r.userId}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectTipster(r.userId)}
                      disabled={updating === r.userId}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 text-white text-sm font-medium hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {impersonateError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center justify-between">
            <span>{impersonateError}</span>
            <button onClick={() => setImpersonateError(null)} className="text-red-600 dark:text-red-400 hover:underline text-sm">Dismiss</button>
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by email, username..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent w-64 shadow-sm"
          />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-sm"
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="tipster">Tipster</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={load}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Search
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading users...</p>
            </div>
          </div>
        )}
        {!loading && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="relative group">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 relative">
                              {u.avatar && (u.avatar.startsWith('http') || u.avatar.startsWith('/')) ? (
                                <img
                                  src={u.avatar.startsWith('http') ? u.avatar : `${API_URL.replace(/\/$/, '')}${u.avatar}`}
                                  alt=""
                                  className="w-full h-full object-cover absolute inset-0"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; const fallback = e.currentTarget.parentElement?.querySelector('[data-avatar-fallback]'); if (fallback) (fallback as HTMLElement).classList.remove('hidden'); }}
                                />
                              ) : null}
                              <span className={`text-sm font-bold text-gray-500 dark:text-gray-400 ${u.avatar && (u.avatar.startsWith('http') || u.avatar.startsWith('/')) ? 'hidden' : ''}`} data-avatar-fallback>
                                {(u.displayName || u.username || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="sr-only"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) uploadUserAvatar(u.id, f);
                                  e.target.value = '';
                                }}
                              />
                              <span className="text-white text-xs font-medium pointer-events-none">{avatarUploading === u.id ? '...' : 'Edit'}</span>
                            </label>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{u.displayName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={u.role}
                          onChange={(e) => updateUser(u.id, { role: e.target.value })}
                          disabled={updating === u.id || u.role === 'admin'}
                          className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
                        >
                          <option value="user">User</option>
                          <option value="tipster">Tipster</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${u.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {/* Login as user (any non-admin) */}
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => impersonateUser(u.id)}
                              disabled={impersonating !== null}
                              title="Login as this user"
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
                            >
                              {impersonating === u.id ? (
                                <span className="text-xs">...</span>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                              )}
                            </button>
                          )}

                          {/* Existing suspend/activate buttons */}
                          {u.status === 'active' && u.role !== 'admin' && (
                            <button
                              onClick={() => updateUser(u.id, { status: 'suspended' })}
                              disabled={updating === u.id}
                              className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
                            >
                              Suspend
                            </button>
                          )}
                          {u.status === 'suspended' && (
                            <button
                              onClick={() => updateUser(u.id, { status: 'active' })}
                              disabled={updating === u.id}
                              className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 py-6 px-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
