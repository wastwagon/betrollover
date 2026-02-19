import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Linking } from 'react-native';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { API_BASE, WEB_URL, checkAgeVerificationRequired } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

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

interface Accumulator {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  status: string;
  result?: string;
  picks: Pick[];
  createdAt?: string;
}

export default function MyPicksScreen() {
  const [picks, setPicks] = useState<Accumulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPicks = useCallback(async (isRefresh = false) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/accumulators/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (await checkAgeVerificationRequired(res)) return;
      if (!res.ok) throw new Error('Failed to load picks');
      const data = await res.json();
      setPicks(Array.isArray(data) ? data : []);
    } catch {
      setPicks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPicks();
  }, [fetchPicks]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Picks',
          headerShown: true,
          headerBackVisible: true,
          headerRight: () => (
            <Pressable
              onPress={() => Linking.openURL(`${WEB_URL}/create-pick`)}
              style={styles.headerButton}
              hitSlop={12}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              <Text style={styles.headerButtonText}>Create</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        {loading ? (
          <LoadingSkeleton count={3} variant="cards" />
        ) : picks.length === 0 ? (
          <EmptyState
            title="No picks yet"
            description="Create your first pick and share it on the marketplace. Use the web app to create picks."
            icon="🎯"
            actionLabel="Go to Marketplace"
            actionHref="/(tabs)/marketplace"
          />
        ) : (
          <FlatList
            data={picks}
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
                tipster={null}
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
                onRefresh={() => fetchPicks(true)}
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
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: spacing.sm,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
