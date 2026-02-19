import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { API_BASE, checkAgeVerificationRequired } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';

type PriceFilter = 'all' | 'free' | 'paid';
type SortBy = 'newest' | 'price-low' | 'price-high' | 'tipster-rank';

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

interface Tipster {
  id: number;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  winRate: number;
  totalPicks: number;
  rank: number;
}

interface Accumulator {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  purchaseCount?: number;
  picks: Pick[];
  tipster?: Tipster | null;
  createdAt?: string;
  status?: string;
  result?: string;
}

export default function MarketplaceTab() {
  const [picks, setPicks] = useState<Accumulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [purchaseModal, setPurchaseModal] = useState<Accumulator | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [marketRes, walletRes, purchasedRes] = await Promise.all([
        fetch(`${API_BASE}/accumulators/marketplace?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/wallet/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/accumulators/purchased`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (await checkAgeVerificationRequired(marketRes)) return;

      const marketData = marketRes.ok ? await marketRes.json() : {};
      const items = marketData?.items ?? (Array.isArray(marketData) ? marketData : []);
      setPicks(items);

      if (walletRes.ok) {
        const w = await walletRes.json();
        setWalletBalance(Number(w.balance));
      }
      if (purchasedRes.ok) {
        const purchased = await purchasedRes.json();
        const ids = new Set<number>(
          (purchased || [])
            .map((p: { accumulatorId?: number; pick?: { id?: number } }) => p.accumulatorId ?? p.pick?.id)
            .filter((id: number | undefined): id is number => typeof id === 'number')
        );
        setPurchasedIds(ids);
      }
    } catch {
      setPicks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAndSorted = useMemo(() => {
    let list = [...picks];
    if (priceFilter === 'free') list = list.filter((p) => p.price === 0);
    if (priceFilter === 'paid') list = list.filter((p) => p.price > 0);
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'tipster-rank') {
      list.sort((a, b) => (a.tipster?.rank ?? 999) - (b.tipster?.rank ?? 999));
    }
    return list;
  }, [picks, priceFilter, sortBy]);

  const handlePurchase = async (item: Accumulator) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    if (item.price > 0 && (walletBalance === null || walletBalance < item.price)) {
      Alert.alert(
        'Insufficient funds',
        `You need GHS ${item.price.toFixed(2)} but have GHS ${walletBalance?.toFixed(2) ?? '0.00'}. Top up your wallet.`,
        [{ text: 'OK' }, { text: 'Top Up', onPress: () => router.push('/(tabs)/wallet') }]
      );
      return;
    }

    setPurchasing(item.id);
    setPurchaseModal(null);
    try {
      const res = await fetch(`${API_BASE}/accumulators/${item.id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setPurchasedIds((prev) => new Set([...prev, item.id]));
        const walletRes = await fetch(`${API_BASE}/wallet/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (walletRes.ok) {
          const w = await walletRes.json();
          setWalletBalance(Number(w.balance));
        }
        setSuccessMessage('Coupon purchased! View in My Purchases.');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Purchase failed', err.message || 'Something went wrong');
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  const recordView = (id: number) => {
    fetch(`${API_BASE}/accumulators/${id}/view`, { method: 'POST' }).catch(() => {});
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Marketplace</Text>
        <Text style={styles.subtitle}>Browse picks from top tipsters</Text>
        <LoadingSkeleton count={4} variant="cards" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marketplace</Text>
      <Text style={styles.subtitle}>Browse picks from top tipsters</Text>

      {successMessage && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{successMessage}</Text>
          <Pressable onPress={() => router.push('/my-purchases')}>
            <Text style={styles.successLink}>View</Text>
          </Pressable>
        </View>
      )}

      {picks.length > 0 && (
        <View style={styles.filters}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Price</Text>
            <View style={styles.filterChips}>
              {(['all', 'free', 'paid'] as const).map((f) => (
                <Pressable
                  key={f}
                  style={[styles.chip, priceFilter === f && styles.chipActive]}
                  onPress={() => setPriceFilter(f)}
                >
                  <Text style={[styles.chipText, priceFilter === f && styles.chipTextActive]}>
                    {f === 'all' ? 'All' : f === 'free' ? 'Free' : 'Paid'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Sort</Text>
            <View style={styles.filterChips}>
              {(['newest', 'price-low', 'price-high', 'tipster-rank'] as const).map((s) => (
                <Pressable
                  key={s}
                  style={[styles.chip, styles.chipSmall, sortBy === s && styles.chipActive]}
                  onPress={() => setSortBy(s)}
                >
                  <Text style={[styles.chipText, styles.chipTextSmall, sortBy === s && styles.chipTextActive]} numberOfLines={1}>
                    {s === 'newest' ? 'Newest' : s === 'price-low' ? 'Low' : s === 'price-high' ? 'High' : 'Rank'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      {filteredAndSorted.length === 0 ? (
        <EmptyState
          title={picks.length === 0 ? 'No picks yet' : 'No matches'}
          description={
            picks.length === 0
              ? 'Browse tipsters to see their picks. New picks appear here when tipsters list them.'
              : 'Try changing your filters.'
          }
          icon="🛒"
          actionLabel="Browse Tipsters"
          actionHref="/(tabs)/tipsters"
        />
      ) : (
        <FlatList
          data={filteredAndSorted}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PickCard
              id={item.id}
              title={item.title}
              totalPicks={item.totalPicks}
              totalOdds={item.totalOdds}
              price={item.price}
              status={item.status}
              result={item.result}
              picks={item.picks ?? []}
              purchaseCount={item.purchaseCount}
              tipster={item.tipster}
              isPurchased={purchasedIds.has(item.id)}
              canPurchase={item.price === 0 || (walletBalance !== null && walletBalance >= item.price)}
              walletBalance={walletBalance}
              onPurchase={() => {
                if (item.price > 0) {
                  setPurchaseModal(item);
                } else {
                  handlePurchase(item);
                }
              }}
              purchasing={purchasing === item.id}
              onView={() => {
                recordView(item.id);
                if (purchasedIds.has(item.id)) router.push('/my-purchases');
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.primary]} />
          }
        />
      )}

      {/* Purchase confirmation modal */}
      <Modal visible={!!purchaseModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPurchaseModal(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {purchaseModal && (
              <>
                <Text style={styles.modalTitle}>Confirm Purchase</Text>
                <Text style={styles.modalPick}>{purchaseModal.title}</Text>
                <Text style={styles.modalPrice}>GHS {purchaseModal.price.toFixed(2)}</Text>
                <Text style={styles.modalBalance}>
                  Your balance: GHS {walletBalance?.toFixed(2) ?? '0.00'}
                </Text>
                <View style={styles.modalActions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setPurchaseModal(null)}
                    style={styles.modalButton}
                  />
                  <Button
                    title={purchasing === purchaseModal.id ? 'Processing...' : 'Purchase'}
                    onPress={() => handlePurchase(purchaseModal)}
                    loading={purchasing === purchaseModal.id}
                    style={styles.modalButton}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  title: {
    ...typography.titleSm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  successText: { color: colors.text, fontSize: 14 },
  successLink: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  filters: { marginBottom: spacing.lg },
  filterRow: { marginBottom: spacing.sm },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.bgWarm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSmall: { paddingHorizontal: 10 },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 14, color: colors.text },
  chipTextSmall: { fontSize: 12 },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  listContent: { paddingBottom: spacing.xxl * 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalPick: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalBalance: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: { flex: 1 },
});
