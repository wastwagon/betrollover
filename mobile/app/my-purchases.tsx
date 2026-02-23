import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  Pressable,
} from 'react-native';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { API_BASE, checkAgeVerificationRequired } from '@/lib/api';
import { colors, spacing } from '@/lib/theme';

/* ─── Types ──────────────────────────────────────────────── */
interface Pick {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  fixtureStatus?: string | null;
  result?: string;
}

interface Purchase {
  id: number;
  accumulatorId: number;
  purchasePrice: number;
  purchasedAt: string;
  pick?: {
    id: number;
    title: string;
    totalPicks: number;
    totalOdds: number;
    status: string;
    result?: string;
    sport?: string;
    picks: Pick[];
    tipster?: {
      displayName: string;
      username: string;
      winRate: number;
      totalPicks: number;
      wonPicks: number;
      lostPicks: number;
      rank: number;
      avatarUrl?: string | null;
    };
  };
}

/* ─── Filters ─────────────────────────────────────────────── */
const RESULT_FILTERS = [
  { key: 'all',      label: 'All',      icon: '🌍' },
  { key: 'pending',  label: 'Pending',  icon: '⏳' },
  { key: 'won',      label: 'Won',      icon: '✅' },
  { key: 'lost',     label: 'Lost',     icon: '❌' },
  { key: 'refunded', label: 'Refunded', icon: '💸' },
] as const;
type ResultFilter = typeof RESULT_FILTERS[number]['key'];

const SPORT_CHIPS = [
  { key: 'all',               label: '🌍 All' },
  { key: 'football',          label: '⚽ Football' },
  { key: 'basketball',        label: '🏀 Basketball' },
  { key: 'rugby',             label: '🏉 Rugby' },
  { key: 'mma',               label: '🥊 MMA' },
  { key: 'volleyball',        label: '🏐 Volleyball' },
  { key: 'hockey',            label: '🏒 Hockey' },
  { key: 'american_football', label: '🏈 Amer. Football' },
  { key: 'tennis',            label: '🎾 Tennis' },
  { key: 'multi',             label: '🌐 Multi-Sport' },
];

/* ─── Page ────────────────────────────────────────────────── */
export default function MyPurchasesScreen() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');

  const fetchPurchases = useCallback(async (isRefresh = false) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accumulators/purchased`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (await checkAgeVerificationRequired(res)) return;
      if (!res.ok) throw new Error('Failed to load purchases');
      const data = await res.json();
      setPurchases(Array.isArray(data) ? data : []);
    } catch {
      setPurchases([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  /* ─── Derived stats ───────────────────────────────────── */
  const stats = useMemo(() => {
    const valid = purchases.filter((p) => p.pick);
    return {
      total:    valid.length,
      pending:  valid.filter((p) => p.pick?.result === 'pending').length,
      won:      valid.filter((p) => p.pick?.result === 'won').length,
      lost:     valid.filter((p) => p.pick?.result === 'lost').length,
      refunded: valid.filter((p) => p.pick?.result === 'refunded').length,
    };
  }, [purchases]);

  /* ─── Sports present ──────────────────────────────────── */
  const availableSports = useMemo(() => {
    const seen = new Set<string>();
    purchases.forEach((p) => { if (p.pick?.sport) seen.add(p.pick.sport); });
    return Array.from(seen);
  }, [purchases]);

  /* ─── Filtered list ───────────────────────────────────── */
  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      if (!p.pick) return false;
      const r = resultFilter === 'all' || p.pick.result === resultFilter;
      const s = sportFilter === 'all' || p.pick.sport === sportFilter;
      return r && s;
    });
  }, [purchases, resultFilter, sportFilter]);

  const ListHeader = (
    <View>
      {/* ─── Stats row ──────────────────────────────────── */}
      {stats.total > 0 && (
        <View style={styles.statsRow}>
          {[
            { label: 'Total',   value: stats.total,   color: colors.primary },
            { label: 'Pending', value: stats.pending, color: '#f59e0b' },
            { label: 'Won',     value: stats.won,     color: '#10b981' },
            { label: 'Lost',    value: stats.lost,    color: '#ef4444' },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.statCard}>
              <Text style={[styles.statValue, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ─── Result filter pills ──────────────────────────── */}
      {stats.total > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {RESULT_FILTERS.map(({ key, label, icon }) => {
            const count =
              key === 'all' ? stats.total
              : key === 'won' ? stats.won
              : key === 'lost' ? stats.lost
              : key === 'pending' ? stats.pending
              : stats.refunded;
            const active = resultFilter === key;
            return (
              <Pressable
                key={key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setResultFilter(key)}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {icon} {label}
                </Text>
                <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ─── Sport chips (only if multi-sport) ────────────── */}
      {availableSports.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {SPORT_CHIPS.filter((c) => c.key === 'all' || availableSports.includes(c.key)).map(
            ({ key, label }) => {
              const active = sportFilter === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.sportChip, active && styles.sportChipActive]}
                  onPress={() => setSportFilter(key)}
                >
                  <Text style={[styles.sportChipText, active && styles.sportChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            },
          )}
        </ScrollView>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'My Purchases', headerShown: true, headerBackVisible: true }} />
      <View style={styles.container}>
        {loading ? (
          <LoadingSkeleton count={3} variant="cards" />
        ) : purchases.length === 0 ? (
          <EmptyState
            title="No purchases yet"
            description="Browse the marketplace and purchase picks from verified tipsters."
            icon="🛒"
            actionLabel="Browse Marketplace"
            actionHref="/(tabs)/marketplace"
          />
        ) : filtered.length === 0 ? (
          <View style={{ flex: 1 }}>
            {ListHeader}
            <View style={styles.emptyFilter}>
              <Text style={styles.emptyFilterIcon}>🔍</Text>
              <Text style={styles.emptyFilterTitle}>No picks match this filter</Text>
              <Pressable
                onPress={() => { setResultFilter('all'); setSportFilter('all'); }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>Clear Filters</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(p) => String(p.id)}
            ListHeaderComponent={ListHeader}
            renderItem={({ item: p }) =>
              p.pick ? (
                <PickCard
                  id={p.pick.id}
                  title={p.pick.title}
                  totalPicks={p.pick.totalPicks}
                  totalOdds={p.pick.totalOdds}
                  price={p.purchasePrice}
                  status={p.pick.status}
                  result={p.pick.result}
                  picks={p.pick.picks ?? []}
                  tipster={p.pick.tipster}
                  isPurchased
                  canPurchase={false}
                  onPurchase={() => {}}
                  onView={() => {}}
                />
              ) : null
            }
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchPurchases(true)}
                colors={[colors.primary]}
              />
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl * 2 },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: '500' },

  /* Filters */
  filterScroll: { marginBottom: spacing.xs },
  filterScrollContent: { paddingHorizontal: spacing.md, gap: spacing.xs, paddingRight: spacing.xl },

  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterPillText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterPillTextActive: { color: '#fff' },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  filterBadgeTextActive: { color: '#fff' },

  sportChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sportChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sportChipText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  sportChipTextActive: { color: '#fff', fontWeight: '600' },

  /* Empty filtered */
  emptyFilter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyFilterIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyFilterTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  clearBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  clearBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
