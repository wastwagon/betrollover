import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TipsterCard, type TipsterCardData } from '@/components/TipsterCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { API_BASE } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

type SortBy = 'roi' | 'win_rate' | 'total_profit' | 'follower_count';

export default function TipstersTab() {
  const [tipsters, setTipsters] = useState<TipsterCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('roi');
  const [followLoading, setFollowLoading] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search]);

  const fetchTipsters = useCallback(async (isRefresh = false) => {
    const token = await AsyncStorage.getItem('token');
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const params = new URLSearchParams({
      limit: '50',
      sort_by: sortBy,
      order: 'desc',
    });
    if (searchDebounced.trim()) params.set('search', searchDebounced.trim());

    try {
      const res = await fetch(`${API_BASE}/tipsters?${params}`, { headers });
      const data = res.ok ? await res.json() : { tipsters: [] };
      setTipsters(data.tipsters || []);
    } catch {
      setTipsters([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sortBy, searchDebounced]);

  useEffect(() => {
    fetchTipsters();
  }, [fetchTipsters]);

  const handleFollow = async (tipster: TipsterCardData) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const isFollowing = tipster.is_following ?? false;
    setFollowLoading(tipster.id);
    setTipsters((prev) =>
      prev.map((t) =>
        t.id === tipster.id
          ? {
              ...t,
              is_following: !isFollowing,
              follower_count: Math.max(0, (t.follower_count ?? 0) + (isFollowing ? -1 : 1)),
            }
          : t
      )
    );
    try {
      const res = await fetch(
        `${API_BASE}/tipsters/${encodeURIComponent(tipster.username)}/follow`,
        {
          method: isFollowing ? 'DELETE' : 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update follow');
      }
    } catch (e) {
      setTipsters((prev) =>
        prev.map((t) =>
          t.id === tipster.id
            ? { ...t, is_following: isFollowing, follower_count: tipster.follower_count ?? 0 }
            : t
        )
      );
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update follow');
    } finally {
      setFollowLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Tipsters</Text>
          <Text style={styles.subtitle}>Browse verified tipsters. Rankings on each card.</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or bio..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by</Text>
        <View style={styles.sortChips}>
          {(['roi', 'win_rate', 'total_profit', 'follower_count'] as const).map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, sortBy === s && styles.chipActive]}
              onPress={() => setSortBy(s)}
            >
              <Text style={[styles.chipText, sortBy === s && styles.chipTextActive]}>
                {s === 'roi' ? 'ROI' : s === 'win_rate' ? 'Win Rate' : s === 'total_profit' ? 'Profit' : 'Followers'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <LoadingSkeleton count={4} variant="cards" />
      ) : tipsters.length === 0 ? (
        <EmptyState
          title="No tipsters yet"
          description="Tipsters will appear here soon. Check back later."
          icon="👥"
          actionLabel="Go to Home"
          actionHref="/(tabs)"
        />
      ) : (
        <FlatList
          data={tipsters}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TipsterCard
              tipster={item}
              onFollow={() => handleFollow(item)}
              followLoading={followLoading === item.id}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTipsters(true)}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.titleSm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  searchRow: { marginBottom: spacing.md },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgWarm,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  sortRow: { marginBottom: spacing.lg },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  sortChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.bgWarm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 14, color: colors.text },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  listContent: { paddingBottom: spacing.xxl * 2 },
});
