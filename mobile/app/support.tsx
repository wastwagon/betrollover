import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, TextInput, ScrollView, Modal,
} from 'react-native';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@/lib/api';
import { colors, spacing } from '@/lib/theme';

interface Ticket {
  id: number;
  category: string;
  subject: string;
  status: string;
  adminResponse?: string | null;
  relatedCouponId?: number | null;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  open: '#3b82f6', in_progress: '#f59e0b', resolved: '#10b981', closed: '#6b7280',
};
const CATEGORIES = [
  { key: 'general', label: 'General' },
  { key: 'dispute', label: 'Dispute' },
  { key: 'settlement', label: 'Settlement' },
  { key: 'billing', label: 'Billing' },
  { key: 'other', label: 'Other' },
];

export default function SupportScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'general', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }
    try {
      const r = await fetch(`${API_BASE}/support/my`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setTickets(await r.json());
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.subject.trim() || !form.message.trim()) { setError('Subject and message are required'); return; }
    setSubmitting(true); setError(null);
    const token = await AsyncStorage.getItem('token');
    try {
      const r = await fetch(`${API_BASE}/support`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        setShowForm(false);
        setForm({ category: 'general', subject: '', message: '' });
        load();
      } else {
        const d = await r.json().catch(() => ({}));
        setError(d.message || 'Failed to submit');
      }
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'Support',
        headerBackTitle: 'Back',
        headerRight: () => (
          <Pressable onPress={() => setShowForm(true)}>
            <Text style={styles.headerBtn}>+ New</Text>
          </Pressable>
        ),
      }} />

      {loading ? (
        <View style={styles.center}><Text style={styles.loadingText}>Loading…</Text></View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => String(t.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          contentContainerStyle={tickets.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyIcon}>📬</Text>
              <Text style={styles.emptyTitle}>No tickets yet</Text>
              <Text style={styles.emptySubtitle}>Tap "+ New" to open a support ticket.</Text>
              <Pressable style={styles.newBtn} onPress={() => setShowForm(true)}>
                <Text style={styles.newBtnText}>Open a Ticket</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item: t }) => (
            <View style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketSubject} numberOfLines={1}>{t.subject}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[t.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[t.status] ?? colors.textMuted }]}>
                    {t.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.ticketMeta}>
                {CATEGORIES.find((c) => c.key === t.category)?.label ?? t.category}
                {' · '}{new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </Text>
              {t.adminResponse ? (
                <View style={styles.responseBox}>
                  <Text style={styles.responseLabel}>Admin Response</Text>
                  <Text style={styles.responseText}>{t.adminResponse}</Text>
                </View>
              ) : null}
            </View>
          )}
        />
      )}

      {/* New ticket modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Support Ticket</Text>
                <Pressable onPress={() => setShowForm(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {CATEGORIES.map((c) => (
                  <Pressable key={c.key} onPress={() => setForm((f) => ({ ...f, category: c.key }))}
                    style={[styles.catChip, form.category === c.key && styles.catChipActive]}>
                    <Text style={[styles.catChipText, form.category === c.key && styles.catChipTextActive]}>{c.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                value={form.subject}
                onChangeText={(v) => setForm((f) => ({ ...f, subject: v }))}
                placeholder="Brief description of your issue"
                placeholderTextColor={colors.textMuted}
                maxLength={255}
              />

              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.message}
                onChangeText={(v) => setForm((f) => ({ ...f, message: v }))}
                placeholder="Describe your issue in detail…"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
                <Text style={styles.submitBtnText}>{submitting ? 'Submitting…' : 'Submit Ticket'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  headerBtn:   { color: colors.primary, fontSize: 15, fontWeight: '700', marginRight: 4 },
  list:        { padding: spacing.md, paddingBottom: 80 },
  emptyContainer: { flex: 1 },
  emptyInner:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyIcon:   { fontSize: 40, marginBottom: 12 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 20 },
  newBtn:      { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28 },
  newBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  ticketCard:  { backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  ticketSubject: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, marginRight: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusText:  { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  ticketMeta:  { fontSize: 11, color: colors.textMuted },
  responseBox: { marginTop: spacing.sm, backgroundColor: '#f0fdf4', borderRadius: 10, padding: spacing.sm },
  responseLabel: { fontSize: 10, fontWeight: '700', color: '#166534', marginBottom: 2 },
  responseText: { fontSize: 12, color: '#166534' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle:  { fontSize: 17, fontWeight: '800', color: colors.text },
  modalClose:  { fontSize: 18, color: colors.textMuted, padding: 4 },
  fieldLabel:  { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 12 },
  catScroll:   { marginBottom: 4 },
  catChip:     { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1.5, borderColor: colors.border, marginRight: 8 },
  catChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  catChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  catChipTextActive: { color: colors.primary },
  input:       { backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, fontSize: 14, color: colors.text },
  textarea:    { minHeight: 90, textAlignVertical: 'top' },
  errorText:   { color: colors.error, fontSize: 12, marginTop: 6 },
  submitBtn:   { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
