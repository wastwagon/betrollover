import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, Alert, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/lib/theme';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6001';
const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '🔥'];
const POLL_INTERVAL = 3000;

interface Room { id: number; slug: string; name: string; icon: string; todayMessages: number }
interface ChatUser { id: number; username: string; role: string; countryCode?: string; flagEmoji?: string }
interface Message {
  id: number; content: string; createdAt: string; isFlagged?: boolean;
  user: ChatUser; reactions: Record<string, number>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function roleColor(role: string) {
  if (role === 'admin') return '#dc2626';
  if (role === 'tipster') return '#059669';
  return colors.primary;
}

export default function CommunityScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showRooms, setShowRooms] = useState(true);

  const lastIdRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem('token').then((t) => {
      setToken(t);
      if (t) {
        fetch(`${API}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
          .then((r) => r.json())
          .then((d) => { if (d.id) setCurrentUser(d); })
          .catch(() => {});
      }
    });
    fetch(`${API}/api/v1/chat/rooms`)
      .then((r) => r.json())
      .then((data) => {
        setRooms(data);
        if (data.length > 0) setActiveRoom(data.find((r: Room) => r.slug === 'general') || data[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    setLoading(true);
    setMessages([]);
    lastIdRef.current = 0;

    fetch(`${API}/api/v1/chat/rooms/${activeRoom.slug}/messages?limit=100`)
      .then((r) => r.json())
      .then((data: Message[]) => {
        setMessages(data);
        if (data.length > 0) lastIdRef.current = data[data.length - 1].id;
        setLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
      })
      .catch(() => setLoading(false));
  }, [activeRoom?.slug]);

  const poll = useCallback(async () => {
    if (!activeRoom) return;
    try {
      const res = await fetch(`${API}/api/v1/chat/rooms/${activeRoom.slug}/poll?after_id=${lastIdRef.current}`);
      const newMsgs: Message[] = await res.json();
      if (newMsgs.length > 0) {
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const added = newMsgs.filter((m) => !existing.has(m.id));
          return [...prev, ...added];
        });
        lastIdRef.current = newMsgs[newMsgs.length - 1].id;
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch {}
  }, [activeRoom?.slug]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [poll]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    if (!token) { Alert.alert('Login required', 'Please log in to send messages'); return; }
    setSending(true);
    try {
      const res = await fetch(`${API}/api/v1/chat/rooms/${activeRoom?.slug}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Message blocked', data.message || 'Unable to send message');
      } else {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
        lastIdRef.current = Math.max(lastIdRef.current, data.id);
        setInput('');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    }
    setSending(false);
  };

  const handleReact = async (messageId: number, emoji: string) => {
    if (!token) return;
    const res = await fetch(`${API}/api/v1/chat/messages/${messageId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const reactions = await res.json();
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    }
  };

  const handleReport = (messageId: number) => {
    if (!token) return;
    Alert.alert('Report message', 'Are you sure you want to report this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report', style: 'destructive', onPress: async () => {
          await fetch(`${API}/api/v1/chat/messages/${messageId}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ reason: 'spam' }),
          });
          Alert.alert('Reported', 'Thank you for reporting. Our team will review it.');
        },
      },
    ]);
  };

  // ── Room selector ──────────────────────────────────────────────────────
  if (showRooms) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Community Chat</Text>
          <Text style={[s.headerSub, { color: colors.textMuted }]}>Choose a room to join</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {rooms.map((room) => (
            <TouchableOpacity
              key={room.slug}
              style={[s.roomCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { setActiveRoom(room); setShowRooms(false); }}
            >
              <Text style={s.roomIcon}>{room.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.roomName, { color: colors.text }]}>{room.name}</Text>
                {room.todayMessages > 0 && (
                  <Text style={[s.roomMeta, { color: colors.textMuted }]}>{room.todayMessages} messages today</Text>
                )}
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}

          {/* Rules */}
          <View style={[s.rulesBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.rulesTitle, { color: colors.text }]}>Community Rules</Text>
            {['No external links or contact info', 'No spam or repeated messages', 'Keep it sport-related', 'Respect all members'].map((r) => (
              <Text key={r} style={[s.ruleItem, { color: colors.textMuted }]}>• {r}</Text>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Chat view ──────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[s.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header with back button */}
      <View style={[s.chatHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setShowRooms(true)} style={s.backBtn}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>‹ Rooms</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[s.chatHeaderTitle, { color: colors.text }]}>
            {activeRoom?.icon} {activeRoom?.name}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Messages */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[{ color: colors.textMuted, marginTop: 8 }]}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 40 }}>{activeRoom?.icon}</Text>
              <Text style={[{ color: colors.textMuted, marginTop: 8 }]}>No messages yet. Say something!</Text>
            </View>
          }
          renderItem={({ item: msg }) => (
            <View style={s.msgRow}>
              {/* Avatar */}
              <View style={[s.avatar, { backgroundColor: roleColor(msg.user.role) }]}>
                <Text style={s.avatarText}>{(msg.user.username || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.msgMeta}>
                  <Text style={[s.msgUser, { color: colors.text }]}>{msg.user.username}</Text>
                  {msg.user.flagEmoji && <Text style={{ fontSize: 14 }}>{msg.user.flagEmoji}</Text>}
                  {msg.user.role === 'tipster' && (
                    <View style={s.tipsterBadge}><Text style={s.tipsterBadgeText}>✓ TIPSTER</Text></View>
                  )}
                  {msg.user.role === 'admin' && (
                    <View style={s.adminBadge}><Text style={s.adminBadgeText}>ADMIN</Text></View>
                  )}
                  <Text style={[s.msgTime, { color: colors.textMuted }]}>{timeAgo(msg.createdAt)}</Text>
                </View>
                <Text style={[s.msgContent, { color: colors.text }]}>{msg.content}</Text>

                {/* Reactions */}
                <View style={s.reactionsRow}>
                  {ALLOWED_EMOJIS.map((emoji) => {
                    const count = msg.reactions[emoji] || 0;
                    return (
                      <TouchableOpacity
                        key={emoji}
                        onPress={() => handleReact(msg.id, emoji)}
                        style={[s.reactionBtn, count > 0 && s.reactionBtnActive]}
                      >
                        <Text style={{ fontSize: 14 }}>{emoji}</Text>
                        {count > 0 && <Text style={s.reactionCount}>{count}</Text>}
                      </TouchableOpacity>
                    );
                  })}
                  {currentUser && msg.user.id !== currentUser.id && (
                    <TouchableOpacity onPress={() => handleReport(msg.id)} style={s.reportBtn}>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>⚑</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Input */}
      <View style={[s.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {token ? (
          <>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={`Message ${activeRoom?.name || ''}...`}
              placeholderTextColor={colors.textMuted}
              style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              maxLength={500}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending || !input.trim()}
              style={[s.sendBtn, { backgroundColor: !input.trim() ? colors.border : colors.primary }]}
            >
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sendText}>Send</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[s.loginPrompt, { color: colors.textMuted }]}>
            Log in to participate in the chat
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 2 },
  roomCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 12, borderWidth: 1, gap: 12,
  },
  roomIcon: { fontSize: 28 },
  roomName: { fontSize: 16, fontWeight: '600' },
  roomMeta: { fontSize: 12, marginTop: 2 },
  rulesBox: { marginTop: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  rulesTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  ruleItem: { fontSize: 12, marginBottom: 3 },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 12,
    paddingHorizontal: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 60 },
  chatHeaderTitle: { fontSize: 15, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  msgRow: { flexDirection: 'row', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  msgUser: { fontSize: 13, fontWeight: '600' },
  msgTime: { fontSize: 11 },
  msgContent: { fontSize: 14, lineHeight: 20 },
  tipsterBadge: { backgroundColor: '#059669', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  tipsterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  adminBadge: { backgroundColor: '#dc2626', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  adminBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  reactionsRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' },
  reactionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: '#374151',
  },
  reactionBtnActive: { borderColor: '#6366f1', backgroundColor: '#1e1b4b' },
  reactionCount: { color: '#a5b4fc', fontSize: 12 },
  reportBtn: { padding: 4 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8, gap: 8, borderTopWidth: 1,
  },
  input: {
    flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    fontSize: 14, maxHeight: 100,
  },
  sendBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  loginPrompt: { flex: 1, textAlign: 'center', padding: 12, fontSize: 13 },
});
