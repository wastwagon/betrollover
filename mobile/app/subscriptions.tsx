import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { API_BASE, checkAgeVerificationRequired } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';

interface Subscription {
  id: number;
  packageId: number;
  startedAt: string;
  endsAt: string;
  amountPaid: number;
  status: string;
  package?: { id: number; name: string; price: number; durationDays: number };
}

interface FeedPick {
  id: number;
  title: string;
  totalPicks: number;
  totalOdds: number;
  price: number;
  purchaseCount: number;
  picks: Array<{ matchDescription?: string; prediction?: string; odds?: number }>;
  tipster?: { displayName: string; username: string; avatarUrl: string | null; winRate: number } | null;
}

export default function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [feedPicks, setFeedPicks] = useState<FeedPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [subsRes, feedRes] = await Promise.all([
        fetch(`${API_BASE}/subscriptions/me`, { headers }),
        fetch(`${API_BASE}/accumulators/subscription-feed?limit=20`, { headers }),
      ]);
      if (await checkAgeVerificationRequired(subsRes)) return;
      const subs = subsRes.ok ? await subsRes.json() : [];
      const feedData = feedRes.ok ? await feedRes.json() : {};
      const feed = feedData?.items ?? [];
      setSubscriptions(Array.isArray(subs) ? subs : []);
      setFeedPicks(Array.isArray(feed) ? feed : []);
    } catch {
      setSubscriptions([]);
      setFeedPicks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeSubs = subscriptions.filter((s) => s.status === 'active');

  return (
    <>
      <Stack.Screen options={{ title: 'Subscriptions', headerShown: true, headerBackVisible: true }} />
      <View style={styles.container}>
        {loading ? (
          <LoadingSkeleton count={4} variant="cards" />
        ) : activeSubs.length === 0 ? (
          <EmptyState
            title="No active subscriptions"
            description="Subscribe to tipsters to see their subscription-only coupons here."
            icon="👥"
            actionLabel="Browse Tipsters"
            actionHref="/(tabs)/tipsters"
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.primary]} />
            }
          >
            <Text style={styles.sectionTitle}>Active subscriptions</Text>
            <View style={styles.subsGrid}>
              {activeSubs.map((s) => (
                <View key={s.id} style={styles.subCard}>
                  <Text style={styles.subName}>{s.package?.name ?? 'Package'}</Text>
                  <Text style={styles.subEnds}>Ends {new Date(s.endsAt).toLocaleDateString()}</Text>
                  <Text style={styles.subPrice}>
                    GHS {Number(s.amountPaid).toFixed(2)}/{s.package?.durationDays ?? 30}d
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Subscription coupons</Text>
            {feedPicks.length === 0 ? (
              <Text style={styles.emptyFeed}>No coupons from subscribed tipsters yet.</Text>
            ) : (
              feedPicks.map((pick) => {
                const t = pick.tipster;
                const tipster = t
                  ? {
                      id: 0,
                      displayName: t.displayName,
                      username: t.username,
                      avatarUrl: t.avatarUrl ?? null,
                      winRate: t.winRate,
                      totalPicks: 0,
                      rank: 0,
                    }
                  : null;
                return (
                  <PickCard
                    key={pick.id}
                    id={pick.id}
                    title={pick.title}
                    totalPicks={pick.totalPicks}
                    totalOdds={pick.totalOdds}
                    price={pick.price}
                    purchaseCount={pick.purchaseCount}
                    picks={pick.picks || []}
                    tipster={tipster}
                    isPurchased={true}
                    canPurchase={false}
                    onPurchase={() => {}}
                    onView={() => {}}
                  />
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  content: { paddingBottom: spacing.xxl * 2 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  subsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  subCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  subEnds: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  subPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
  },
  emptyFeed: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
});
