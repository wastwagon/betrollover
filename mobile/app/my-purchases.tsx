import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { API_BASE, checkAgeVerificationRequired } from '@/lib/api';
import { colors, spacing } from '@/lib/theme';

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
    picks: Pick[];
    tipster?: { displayName: string; username: string; winRate: number; totalPicks: number; rank: number; avatarUrl?: string | null };
  };
}

export default function MyPurchasesScreen() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPurchases = useCallback(async (isRefresh = false) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
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

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const items = purchases
    .filter((p) => p.pick)
    .map((p) => ({
      ...p.pick!,
      purchasePrice: p.purchasePrice,
      purchasedAt: p.purchasedAt,
    }));

  return (
    <>
      <Stack.Screen options={{ title: 'My Purchases', headerShown: true, headerBackVisible: true }} />
      <View style={styles.container}>
        {loading ? (
          <LoadingSkeleton count={3} variant="cards" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No purchases yet"
            description="Browse the marketplace and purchase picks from verified tipsters."
            icon="🛒"
            actionLabel="Browse Marketplace"
            actionHref="/(tabs)/marketplace"
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <PickCard
                id={item.id}
                title={item.title}
                totalPicks={item.totalPicks}
                totalOdds={item.totalOdds}
                price={item.purchasePrice}
                status={item.status}
                result={item.result}
                picks={item.picks ?? []}
                tipster={item.tipster}
                isPurchased={true}
                canPurchase={false}
                onPurchase={() => {}}
                onView={() => {}}
              />
            )}
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
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  listContent: { paddingBottom: spacing.xxl * 2 },
});
