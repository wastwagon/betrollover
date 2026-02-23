import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, ScrollView,
} from 'react-native';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@/lib/api';
import { colors, spacing } from '@/lib/theme';

/* ─── Types ──────────────────────────────────────────────────────────── */
interface Transaction {
  id: number;
  type: string;
  amount: string;
  description?: string | null;
  reference?: string | null;
  status: string;
  createdAt: string;
}

const TX_LABEL: Record<string, string> = {
  payout: 'Net Payout', commission: 'Platform Fee', deposit: 'Deposit',
  withdrawal: 'Withdrawal', refund: 'Refund', purchase: 'Purchase', credit: 'Credit',
};
const TX_ICON: Record<string, string> = {
  payout: '💰', commission: '🏛', deposit: '⬆', withdrawal: '💸',
  refund: '↩', purchase: '🛒', credit: '✨',
};

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function isCredit(type: string) { return ['payout','deposit','refund','credit'].includes(type); }
function formatGHS(val: string | number) { return `GHS ${Math.abs(Number(val)).toFixed(2)}`; }

/* ─── EarningsScreen ──────────────────────────────────────────────────── */
export default function EarningsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'payout' | 'commission' | 'other'>('all');

  const fetch_ = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }
    try {
      const r = await fetch(`${API_BASE}/wallet/transactions?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const d = await r.json();
        setTransactions(Array.isArray(d) ? d : d.items ?? []);
      }
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions;
    if (filter === 'payout') return transactions.filter((t) => t.type === 'payout');
    if (filter === 'commission') return transactions.filter((t) => t.type === 'commission');
    return transactions.filter((t) => !['payout','commission'].includes(t.type));
  }, [transactions, filter]);

  const totalNetEarned = useMemo(
    () => transactions.filter((t) => t.type === 'payout').reduce((s, t) => s + Number(t.amount), 0),
    [transactions],
  );
  const totalFee = useMemo(
    () => transactions.filter((t) => t.type === 'commission').reduce((s, t) => s + Number(t.amount), 0),
    [transactions],
  );

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'payout', label: 'Payouts' },
    { key: 'commission', label: 'Fees' },
    { key: 'other', label: 'Other' },
  ];

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Earnings', headerBackTitle: 'Back' }} />
        <Text style={styles.loadingText}>Loading earnings…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Earnings & Payouts', headerBackTitle: 'Back' }} />

      <FlatList
        data={filtered}
        keyExtractor={(t) => String(t.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch_(true)} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            {/* Summary cards */}
            <View style={styles.summaryRow}>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.cardLabel}>Net Earned</Text>
                <Text style={[styles.cardValue, { color: colors.success }]}>{formatGHS(totalNetEarned)}</Text>
              </View>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.cardLabel}>Platform Fees</Text>
                <Text style={[styles.cardValue, { color: '#f59e0b' }]}>{formatGHS(totalFee)}</Text>
              </View>
            </View>
            {totalFee > 0 && (
              <View style={styles.breakdown}>
                <Text style={styles.breakdownText}>
                  Gross: {formatGHS(totalNetEarned + totalFee)}  ·  Fee: {formatGHS(totalFee)}  ·  Net: {formatGHS(totalNetEarned)}
                </Text>
              </View>
            )}

            {/* Filter tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
              {FILTERS.map((f) => (
                <Pressable key={f.key} onPress={() => setFilter(f.key)}
                  style={[styles.filterTab, filter === f.key && styles.filterTabActive]}>
                  <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>{f.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Transactions ({filtered.length})</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtitle}>Your earnings and fees will appear here once your coupons settle.</Text>
          </View>
        }
        renderItem={({ item: t }) => (
          <View style={[styles.txRow, t.type === 'commission' && styles.txRowFee]}>
            <Text style={styles.txIcon}>{TX_ICON[t.type] ?? '↔'}</Text>
            <View style={styles.txInfo}>
              <Text style={styles.txLabel}>{TX_LABEL[t.type] ?? t.type}</Text>
              <Text style={styles.txDesc} numberOfLines={1}>
                {t.description || new Date(t.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'2-digit' })}
              </Text>
            </View>
            <Text style={[
              styles.txAmount,
              t.type === 'commission' ? { color: '#f59e0b' } : isCredit(t.type) ? { color: colors.success } : { color: colors.error },
            ]}>
              {t.type === 'commission' ? '−' : isCredit(t.type) ? '+' : '−'}{formatGHS(t.amount)}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  list: { padding: spacing.md, paddingBottom: 100 },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  breakdown: { backgroundColor: '#fffbeb', borderRadius: 12, padding: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: '#fde68a' },
  breakdownText: { fontSize: 11, color: '#92400e', textAlign: 'center' },
  filterScroll: { marginBottom: spacing.sm },
  filterContent: { gap: spacing.xs, paddingHorizontal: 0 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterTabTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm, marginTop: spacing.xs },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border, gap: 10 },
  txRowFee: { opacity: 0.75 },
  txIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  txInfo: { flex: 1 },
  txLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  txDesc: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  txAmount: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 24 },
});
