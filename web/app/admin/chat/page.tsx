'use client';

import { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/AdminSidebar';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/backend';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

type Tab = 'flagged' | 'bans' | 'rooms';

interface FlaggedMessage {
  id: number;
  content: string;
  flagged_count: number;
  report_count: number;
  created_at: string;
  user_id: number;
  username: string;
  chat_warnings: number;
  room_name: string;
}

interface Ban {
  id: number;
  ban_type: string;
  reason: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  user_id: number;
  username: string;
}

interface Room {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminChatPage() {
  const [tab, setTab] = useState<Tab>('flagged');
  const [flagged, setFlagged] = useState<FlaggedMessage[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Ban modal state
  const [banModal, setBanModal] = useState<{ userId: number; username: string } | null>(null);
  const [banType, setBanType] = useState<'mute' | 'ban'>('mute');
  const [banDuration, setBanDuration] = useState('60');
  const [banReason, setBanReason] = useState('');

  // Room edit state
  const [editRoom, setEditRoom] = useState<Room | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (tab === 'flagged') loadFlagged();
    if (tab === 'bans') loadBans();
    if (tab === 'rooms') loadRooms();
  }, [tab]);

  const loadFlagged = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/chat/admin/flagged`, { headers: authHeaders() });
      const data = await res.json();
      setFlagged(data.data || []);
    } catch {}
    setLoading(false);
  };

  const loadBans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/chat/admin/bans`, { headers: authHeaders() });
      const data = await res.json();
      setBans(data.data || []);
    } catch {}
    setLoading(false);
  };

  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/chat/rooms`, { headers: authHeaders() });
      const data = await res.json();
      setRooms(data || []);
    } catch {}
    setLoading(false);
  };

  const deleteMessage = async (id: number) => {
    if (!confirm('Delete this message?')) return;
    await fetch(`${API}/v1/chat/admin/messages/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
      body: JSON.stringify({ reason: 'Admin moderation' }),
    });
    setFlagged((prev) => prev.filter((m) => m.id !== id));
    showToast('Message deleted');
  };

  const openBanModal = (userId: number, username: string) => {
    setBanModal({ userId, username });
    setBanType('mute');
    setBanDuration('60');
    setBanReason('');
  };

  const submitBan = async () => {
    if (!banModal) return;
    await fetch(`${API}/v1/chat/admin/users/${banModal.userId}/ban`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        type: banType,
        duration: banType === 'ban' && banDuration === 'permanent' ? null : parseInt(banDuration),
        reason: banReason || 'Admin moderation',
      }),
    });
    setBanModal(null);
    showToast(`${banModal.username} ${banType === 'mute' ? 'muted' : 'banned'} successfully`);
    if (tab === 'flagged') loadFlagged();
    if (tab === 'bans') loadBans();
  };

  const liftBan = async (userId: number, username: string) => {
    if (!confirm(`Lift ban for ${username}?`)) return;
    await fetch(`${API}/v1/chat/admin/users/${userId}/ban`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    setBans((prev) => prev.filter((b) => b.user_id !== userId));
    showToast(`Ban lifted for ${username}`);
  };

  const saveRoom = async () => {
    if (!editRoom) return;
    await fetch(`${API}/v1/chat/admin/rooms/${editRoom.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        name: editRoom.name,
        description: editRoom.description,
        isActive: editRoom.isActive,
      }),
    });
    setRooms((prev) => prev.map((r) => (r.id === editRoom.id ? editRoom : r)));
    setEditRoom(null);
    showToast('Room updated');
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'flagged', label: 'Flagged Messages', icon: '🚩' },
    { id: 'bans', label: 'Active Bans', icon: '🔨' },
    { id: 'rooms', label: 'Room Management', icon: '🏠' },
  ];

  return (
    <div className="min-h-screen flex bg-gray-950 text-white">
      <AdminSidebar />

      <main className="flex-1 p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Chat Moderation</h1>
          <p className="text-gray-400 text-sm mt-1">Manage community chat rooms, moderate messages, and handle user bans.</p>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
            {toast}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800 pb-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        )}

        {/* ── Flagged Messages ── */}
        {tab === 'flagged' && !loading && (
          <div className="space-y-3">
            {flagged.length === 0 ? (
              <div className="text-center py-12 bg-gray-900 rounded-xl">
                <p className="text-4xl mb-2">✅</p>
                <p className="text-gray-400">No flagged messages — community is clean!</p>
              </div>
            ) : (
              flagged.map((msg) => (
                <div key={msg.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-semibold text-sm">{msg.username}</span>
                        <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">
                          {msg.room_name}
                        </span>
                        <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded">
                          🚩 {msg.flagged_count} flags · {msg.report_count} reports
                        </span>
                        {msg.chat_warnings > 0 && (
                          <span className="text-xs text-amber-400">⚠️ {msg.chat_warnings} warnings</span>
                        )}
                      </div>
                      <p className="text-gray-200 text-sm bg-gray-800 rounded-lg px-3 py-2">{msg.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="bg-red-700 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => openBanModal(msg.user_id, msg.username)}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded-lg"
                      >
                        Mute/Ban
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Active Bans ── */}
        {tab === 'bans' && !loading && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setBanModal({ userId: 0, username: '' })}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                + Issue Ban
              </button>
            </div>
            {bans.length === 0 ? (
              <div className="text-center py-12 bg-gray-900 rounded-xl">
                <p className="text-4xl mb-2">🕊️</p>
                <p className="text-gray-400">No active bans</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-800">
                      <th className="pb-3 pr-4">User</th>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Reason</th>
                      <th className="pb-3 pr-4">Expires</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {bans.map((ban) => (
                      <tr key={ban.id} className="py-3">
                        <td className="py-3 pr-4 font-medium">{ban.username}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            ban.ban_type === 'ban' ? 'bg-red-900 text-red-300' : 'bg-amber-900 text-amber-300'
                          }`}>
                            {ban.ban_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-400">{ban.reason || '—'}</td>
                        <td className="py-3 pr-4 text-gray-400">
                          {ban.expires_at ? new Date(ban.expires_at).toLocaleDateString() : 'Permanent'}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => liftBan(ban.user_id, ban.username)}
                            className="text-indigo-400 hover:text-indigo-300 text-xs underline"
                          >
                            Lift ban
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Room Management ── */}
        {tab === 'rooms' && !loading && (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div key={room.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{room.icon}</span>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {room.name}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        room.isActive ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'
                      }`}>
                        {room.isActive ? 'Active' : 'Closed'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{room.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditRoom({ ...room })}
                  className="bg-gray-700 hover:bg-gray-600 text-sm px-3 py-1.5 rounded-lg"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Ban modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="font-bold text-lg mb-4">
              {banModal.username ? `Mute / Ban ${banModal.username}` : 'Issue Ban'}
            </h3>

            {!banModal.username && (
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Username or User ID</label>
                <input
                  type="text"
                  placeholder="Enter username or ID"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  onChange={(e) => setBanModal({ ...banModal, username: e.target.value, userId: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Action</label>
              <div className="flex gap-2">
                {(['mute', 'ban'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBanType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                      banType === t ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-700 text-gray-400'
                    }`}
                  >
                    {t === 'mute' ? '🔇 Mute' : '🔨 Ban'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Duration</label>
              <select
                value={banDuration}
                onChange={(e) => setBanDuration(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="1440">24 hours</option>
                <option value="10080">7 days</option>
                <option value="43200">30 days</option>
                {banType === 'ban' && <option value="permanent">Permanent</option>}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-1">Reason</label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason for action..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitBan}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg font-medium text-sm"
              >
                Confirm {banType === 'mute' ? 'Mute' : 'Ban'}
              </button>
              <button
                onClick={() => setBanModal(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room edit modal */}
      {editRoom && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="font-bold text-lg mb-4">Edit Room: {editRoom.icon} {editRoom.name}</h3>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Room Name</label>
              <input
                type="text"
                value={editRoom.name}
                onChange={(e) => setEditRoom({ ...editRoom, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <input
                type="text"
                value={editRoom.description || ''}
                onChange={(e) => setEditRoom({ ...editRoom, description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="mb-6 flex items-center gap-3">
              <label className="text-sm text-gray-400">Room Status</label>
              <button
                onClick={() => setEditRoom({ ...editRoom, isActive: !editRoom.isActive })}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
                  editRoom.isActive ? 'bg-emerald-700 text-white' : 'bg-red-800 text-white'
                }`}
              >
                {editRoom.isActive ? '✓ Active' : '✗ Closed'}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveRoom}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium text-sm"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditRoom(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
