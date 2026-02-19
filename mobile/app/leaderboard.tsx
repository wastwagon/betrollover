import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { API_BASE } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';

type Period = 'all_time' | 'monthly' | 'weekly';

interface LeaderboardEntry {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  roi?: number;
  win_rate?: number;
  total_predictions?: number;
  total_wins?: number;
  total_losses?: number;
  total_profit?: number;
  leaderboard_rank?: number;
  rank?: number;
  monthly_predictions?: number;
  monthly_wins?: number;
  monthly_profit?: number;
}

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<Period>('all_time');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());

  const fetchLeaderboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/leaderboard?period=${period}&limit=50`);
      const data = res.ok ? await res.json() : { leaderboard: [] };
      setEntries(data.leaderboard || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const onAvatarError = (id: number) => {
    setAvatarErrors((prev) => new Set(prev).add(id));
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Leaderboard', headerShown: true, headerBackVisible: true }} />
      <View style={styles.container}>
        <Text style={styles.subtitle}>
          Top tipsters by performance. Tap to view their profile.
        </Text>

        <View style={styles.periodRow}>
          {(['all_time', 'monthly', 'weekly'] as const).map((p) => (
            <Pressable
              key={p}
              style={[styles.periodChip, period === p && styles.periodChipActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>
                {p === 'all_time' ? 'All Time' : p === 'monthly' ? 'This Month' : 'This Week'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <LoadingSkeleton count={5} variant="list" />
        ) : entries.length === 0 ? (
          <EmptyState
            title="No leaderboard data"
            description="Tipsters will appear here once they have predictions and results."
            icon="🏆"
            actionLabel="Browse Tipsters"
            actionHref="/(tabs)/tipsters"
          />
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => {
              const rank = item.rank ?? item.leaderboard_rank ?? index + 1;
              const roi = item.roi ?? item.monthly_profit ?? 0;
              const showAvatar = item.avatar_url && !avatarErrors.has(item.id);

              return (
                <Pressable
                  style={styles.entry}
                  onPress={() => router.push(`/tipsters/${item.username}`)}
                >
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>
                      {rank <= 3 ? (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉') : `#${rank}`}
                    </Text>
                  </View>
                  {showAvatar ? (
                    <Image
                      source={{ uri: item.avatar_url! }}
                      style={styles.avatar}
                      onError={() => onAvatarError(item.id)}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarLetter}>
                        {item.display_name?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName} numberOfLines={1}>
                      {item.display_name}
                    </Text>
                    <Text style={styles.entryStats}>
                      {item.total_predictions ?? item.monthly_predictions ?? 0} picks
                      {typeof roi === 'number' && !Number.isNaN(roi)
                        ? ` • ROI ${roi.toFixed(1)}%`
                        : ''}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            }}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchLeaderboard(true)}
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
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.xl },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.bgWarm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  periodChipText: { fontSize: 14, color: colors.text },
  periodChipTextActive: { color: colors.primary, fontWeight: '600' },
  listContent: { paddingBottom: spacing.xxl * 2 },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rankText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarLetter: { fontSize: 18, fontWeight: '700', color: colors.textMuted },
  entryInfo: { flex: 1, minWidth: 0 },
  entryName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  entryStats: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
    fontWeight: '300',
  },
});
