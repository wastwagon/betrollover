'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { useT } from '@/context/LanguageContext';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
const ALLOWED_REACTIONS = ['👍', '❤️', '😂', '🔥'];
const POLL_INTERVAL = 3000; // 3 s normal, slows to 8 s if idle

interface Room {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  todayMessages: number;
  activeInRoom?: number;
  pinnedMessageId?: number;
}

interface ChatUser {
  id: number;
  username: string;
  role: string;
  avatar?: string;
  countryCode?: string;
  flagEmoji?: string;
}

interface Message {
  id: number;
  roomId: number;
  content: string;
  createdAt: string;
  isFlagged?: boolean;
  user: ChatUser;
  reactions: Record<string, number>;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function timeAgo(
  dateStr: string,
  t: (key: string, vars?: Record<string, string>) => string,
): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return t('community.time_sec', { n: String(s) });
  const m = Math.floor(s / 60);
  if (m < 60) return t('community.time_min', { n: String(m) });
  const h = Math.floor(m / 60);
  if (h < 24) return t('community.time_hour', { n: String(h) });
  return t('community.time_day', { n: String(Math.floor(h / 24)) });
}

function UserBadge({ role }: { role: string }) {
  const t = useT();
  if (role === 'admin') {
    return (
      <span className="ml-1 px-1 py-0.5 text-[10px] bg-red-600 text-white rounded font-bold">
        {t('community.badge_admin')}
      </span>
    );
  }
  if (role === 'tipster') {
    return (
      <span className="ml-1 px-1 py-0.5 text-[10px] bg-emerald-600 text-white rounded font-bold">
        ✓ {t('community.badge_tipster')}
      </span>
    );
  }
  return null;
}

function Avatar({ user, size = 32 }: { user: ChatUser; size?: number }) {
  const initials = (user.username || '?')[0].toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.4,
        background: user.role === 'admin' ? '#dc2626' : user.role === 'tipster' ? '#059669' : '#6366f1',
      }}
    >
      {initials}
    </div>
  );
}

function CommunityPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const activeSlug = searchParams.get('room') || 'general';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [totalOnline, setTotalOnline] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pinnedMsg, setPinnedMsg] = useState<Message | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reportingId, setReportingId] = useState<number | null>(null);

  const lastIdRef = useRef(0);
  const idleCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load current user (uses /users/me - same as header)
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${getApiUrl()}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d?.id) setCurrentUser(d); })
      .catch(() => {});
  }, []);

  // Load rooms and presence (total online + active per room), refresh every 30s
  const refreshRoomsAndPresence = useCallback(() => {
    Promise.all([
      fetch(`${getApiUrl()}/chat/rooms`).then((r) => r.json()),
      fetch(`${getApiUrl()}/chat/presence`).then((r) => r.json()),
    ])
      .then(([roomsData, presenceData]) => {
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        setTotalOnline(typeof presenceData?.totalOnline === 'number' ? presenceData.totalOnline : null);
      })
      .catch(() => {
        setRooms([]);
        setTotalOnline(null);
      });
  }, []);

  useEffect(() => {
    refreshRoomsAndPresence();
    const interval = setInterval(refreshRoomsAndPresence, 30000);
    return () => clearInterval(interval);
  }, [refreshRoomsAndPresence]);

  // Load initial messages when room changes
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    lastIdRef.current = 0;
    idleCountRef.current = 0;

    fetch(`${getApiUrl()}/chat/rooms/${activeSlug}/messages?limit=100`)
      .then((r) => r.json())
      .then((data: unknown) => {
        const arr = Array.isArray(data) ? data : [];
        setMessages(arr);
        if (arr.length > 0) lastIdRef.current = (arr[arr.length - 1] as Message).id;
        setLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .catch(() => setLoading(false));
  }, [activeSlug]);

  // Fetch pinned message if room has one
  useEffect(() => {
    const room = rooms.find((r) => r.slug === activeSlug);
    if (room?.pinnedMessageId) {
      const pinned = messages.find((m) => m.id === room.pinnedMessageId);
      setPinnedMsg(pinned || null);
    } else {
      setPinnedMsg(null);
    }
  }, [rooms, activeSlug, messages]);

  // Adaptive polling
  const poll = useCallback(async () => {
    if (document.hidden) return;
    try {
      const res = await fetch(`${getApiUrl()}/chat/rooms/${activeSlug}/poll?after_id=${lastIdRef.current}`);
      if (!res.ok) return;
      const newMsgs: Message[] = await res.json();
      if (newMsgs.length > 0) {
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const added = newMsgs.filter((m) => !existing.has(m.id));
          return [...prev, ...added];
        });
        lastIdRef.current = newMsgs[newMsgs.length - 1].id;
        idleCountRef.current = 0;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } else {
        idleCountRef.current += 1;
      }
    } catch {}
  }, [activeSlug]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const delay = idleCountRef.current >= 5 ? 8000 : POLL_INTERVAL;
    intervalRef.current = setInterval(poll, delay);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [poll]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const token = getToken();
    if (!token) { setError('You must be logged in to chat'); return; }

    setSending(true);
    setError('');
    try {
      const res = await fetch(`${getApiUrl()}/chat/rooms/${activeSlug}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(getApiErrorMessage(data, 'Failed to send message'));
      } else {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === data.id);
          if (exists) return prev;
          return [...prev, data];
        });
        lastIdRef.current = Math.max(lastIdRef.current, data.id);
        setInput('');
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSending(false);
  };

  const handleReact = async (messageId: number, emoji: string) => {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${getApiUrl()}/chat/messages/${messageId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const reactions = await res.json();
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    }
  };

  const handleReport = async (messageId: number) => {
    const token = getToken();
    if (!token) return;
    await fetch(`${getApiUrl()}/chat/messages/${messageId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: 'spam' }),
    });
    setReportingId(null);
  };

  const activeRoom = rooms.find((r) => r.slug === activeSlug);

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />

      <main className="section-ux-community-shell w-full min-w-0" style={{ height: 'calc(100vh - 140px)' }}>
        {/* Active users bar - top center */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100vw-1rem)] flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/95 border border-gray-700 text-sm text-gray-300 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
          {totalOnline !== null ? (
            <span>{totalOnline === 1 ? t('community.users_online', { count: '1' }) : t('community.users_online_plural', { count: String(totalOnline) })}</span>
          ) : (
            <span>—</span>
          )}
        </div>

        {/* Room sidebar */}
        <aside className="w-64 shrink-0 hidden md:flex flex-col gap-1">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">{t('community.rooms_section')}</h2>
          {rooms.map((room) => (
            <button
              key={room.slug}
              type="button"
              onClick={() => router.push(`/community?room=${room.slug}`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                activeSlug === room.slug
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">{room.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{room.name}</div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {room.todayMessages > 0 && (
                    <span>{t('community.messages_today_badge', { count: String(room.todayMessages) })}</span>
                  )}
                  {(room.activeInRoom ?? 0) > 0 && (
                    <span className="text-emerald-400">
                      {t('community.chatting', { count: String(room.activeInRoom) })}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}

          {/* Disclaimer */}
          <div className="mt-4 p-3 bg-gray-900 rounded-lg text-xs text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-400 mb-1">{t('community.rules_title')}</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>{t('community.rule1')}</li>
              <li>{t('community.rule2')}</li>
              <li>{t('community.rule3')}</li>
              <li>{t('community.rule4')}</li>
            </ul>
          </div>
          {/* Ad slot - sidebar below rules */}
          <div className="mt-4">
            <AdSlot zoneSlug="community-sidebar" />
          </div>
        </aside>

        {/* Chat panel + right ad column */}
        <div className="flex-1 flex gap-2 sm:gap-4 min-w-0">
          <div className="flex-1 flex flex-col bg-gray-900 rounded-xl overflow-hidden border border-gray-800 min-w-0">

          {/* Room header */}
          <div className="px-3 sm:px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-2xl shrink-0">{activeRoom?.icon}</span>
              <div className="min-w-0">
                <h1 className="font-bold text-white truncate">{activeRoom?.name || t('common.loading')}</h1>
                {activeRoom?.description && (
                  <p className="text-xs text-gray-400">{activeRoom.description}</p>
                )}
              </div>
            </div>
            {/* Mobile room selector */}
            <select
              className="md:hidden shrink-0 min-w-0 max-w-[45%] bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-2 py-1"
              aria-label={t('community.choose_room')}
              value={activeSlug}
              onChange={(e) => router.push(`/community?room=${e.target.value}`)}
            >
              {rooms.map((r) => (
                <option key={r.slug} value={r.slug}>{r.icon} {r.name}</option>
              ))}
            </select>
          </div>

          {/* Pinned message */}
          {pinnedMsg && (
            <div className="px-4 py-2 bg-indigo-950 border-b border-indigo-800 flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
              <span className="text-indigo-400 text-sm shrink-0">📌</span>
              <p className="text-sm text-indigo-200 flex-1 min-w-0 break-words">{pinnedMsg.content}</p>
              <span className="text-xs text-indigo-400 shrink-0 sm:ml-auto">{pinnedMsg.user.username}</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm">{t('community.loading_messages')}</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2">
                <span className="text-5xl">{activeRoom?.icon || '💬'}</span>
                <p className="font-medium">{t('community.no_messages')}</p>
                <p className="text-sm">{t('community.empty_invite')}</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex gap-3 group">
                  <Avatar user={msg.user} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                      <span className="font-semibold text-sm">{msg.user.username}</span>
                      {msg.user.flagEmoji && (
                        <span className="text-base leading-none" title={msg.user.countryCode || undefined}>
                          {msg.user.flagEmoji}
                        </span>
                      )}
                      <UserBadge role={msg.user.role} />
                      <span className="text-xs text-gray-500 ml-1">{timeAgo(msg.createdAt, t)}</span>
                    </div>
                    <p className="text-gray-200 text-sm leading-relaxed break-words">{msg.content}</p>

                    {/* Reactions */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {ALLOWED_REACTIONS.map((emoji) => {
                        const count = msg.reactions[emoji] || 0;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReact(msg.id, emoji)}
                            className={`text-sm px-2 py-0.5 rounded-full border transition-colors ${
                              count > 0
                                ? 'border-indigo-500 bg-indigo-950 text-white'
                                : 'border-gray-700 text-gray-500 hover:border-gray-500'
                            }`}
                          >
                            {emoji}{count > 0 && <span className="ml-1 text-xs">{count}</span>}
                          </button>
                        );
                      })}
                      {currentUser && msg.user.id !== currentUser.id && (
                        <button
                          type="button"
                          onClick={() => setReportingId(reportingId === msg.id ? null : msg.id)}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-xs text-gray-500 hover:text-red-400 transition-all ml-1"
                        >
                          ⚑ {t('community.report')}
                        </button>
                      )}
                    </div>

                    {/* Report confirm */}
                    {reportingId === msg.id && (
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <span className="text-gray-400">{t('community.report_confirm')}</span>
                        <button
                          type="button"
                          onClick={() => handleReport(msg.id)}
                          className="text-red-400 hover:text-red-300 font-medium"
                        >
                          {t('community.report_yes')}
                        </button>
                        <button type="button" onClick={() => setReportingId(null)} className="text-gray-500">
                          {t('common.cancel')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Full-width ad above input */}
          <div className="px-4 py-2 border-t border-gray-800">
            <AdSlot zoneSlug="community-above-input" fullWidth className="w-full" />
          </div>
          {/* Input area */}
          <div className="px-4 py-3 border-t border-gray-800">
            {error && (
              <p className="text-red-400 text-xs mb-2 px-1">{error}</p>
            )}
            {currentUser ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={t('community.send_placeholder', { room: activeRoom?.name || '' })}
                  maxLength={500}
                  className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="w-full sm:w-auto shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {sending ? t('community.sending') : t('community.send')}
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <span className="text-gray-400 text-sm">
                  <Link href="/login" className="text-indigo-400 hover:underline font-medium">
                    {t('auth.login')}
                  </Link>{' '}
                  {t('common.or')}{' '}
                  <Link href="/register" className="text-indigo-400 hover:underline font-medium">
                    {t('auth.register')}
                  </Link>{' '}
                  {t('community.to_participate_suffix')}
                </span>
              </div>
            )}
          </div>
          </div>
          {/* Right ad column - desktop only */}
          <aside className="w-72 shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <AdSlot zoneSlug="community-chat-right" className="min-h-[250px]" />
            </div>
          </aside>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

function CommunityPageFallback() {
  const t = useT();
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white w-full min-w-0 max-w-full overflow-x-hidden px-4 text-center">
      {t('community.loading_page')}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<CommunityPageFallback />}>
      <CommunityPageInner />
    </Suspense>
  );
}
