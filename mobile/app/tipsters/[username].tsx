import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { API_BASE } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';

interface Pick {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  result?: string;
}

interface MarketplaceCoupon {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  purchaseCount?: number;
  picks: Pick[];
  tipster?: { displayName: string; username: string; winRate: number; totalPicks: number; rank: number; avatarUrl?: string | null };
  status?: string;
  result?: string;
}

interface TipsterProfile {
  tipster: {
    id: number;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    total_predictions: number;
    total_wins: number;
    total_losses: number;
    win_rate: number;
    roi: number;
    current_streak: number;
    leaderboard_rank: number | null;
    follower_count?: number;
  };
  marketplace_coupons: MarketplaceCoupon[];
  is_following: boolean;
}

export default function TipsterProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [profile, setProfile] = useState<TipsterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const fetchProfile = useCallback(async (isRefresh = false) => {
    if (!username) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const token = await AsyncStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/tipsters/${encodeURIComponent(username)}`, { headers });
      if (!res.ok) throw new Error('Tipster not found');
      const data = await res.json();
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    AsyncStorage.getItem('token').then((token) => {
      if (!token) return;
      Promise.all([
        fetch(`${API_BASE}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`${API_BASE}/accumulators/purchased`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
          r.ok ? r.json() : []
        ),
      ]).then(([wallet, purchased]) => {
        if (wallet) setWalletBalance(Number(wallet.balance));
        if (Array.isArray(purchased)) {
          const ids = new Set<number>(
            purchased
              .map((p: { accumulatorId?: number }) => p.accumulatorId)
              .filter((id: number | undefined): id is number => typeof id === 'number')
          );
          setPurchasedIds(ids);
        }
      });
    });
  }, [username]);

  const handleFollow = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (!profile) return;
    const isFollowing = profile.is_following;
    setFollowLoading(true);
    setProfile((p) => (p ? { ...p, is_following: !isFollowing } : null));
    try {
      const res = await fetch(`${API_BASE}/tipsters/${encodeURIComponent(username!)}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to update follow');
    } catch (e) {
      setProfile((p) => (p ? { ...p, is_following: isFollowing } : null));
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePurchase = async (item: MarketplaceCoupon) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (item.price > 0 && (walletBalance === null || walletBalance < item.price)) {
      Alert.alert('Insufficient funds', 'Top up your wallet to purchase.');
      return;
    }
    setPurchasing(item.id);
    try {
      const res = await fetch(`${API_BASE}/accumulators/${item.id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPurchasedIds((prev) => new Set([...prev, item.id]));
        const wRes = await fetch(`${API_BASE}/wallet/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (wRes.ok) {
          const w = await wRes.json();
          setWalletBalance(Number(w.balance));
        }
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

  if (!username) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Invalid tipster</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Tipster', headerShown: true }} />
        <View style={styles.container}>
          <LoadingSkeleton count={3} variant="cards" />
        </View>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Stack.Screen options={{ title: 'Tipster', headerShown: true }} />
        <View style={styles.container}>
          <EmptyState
            title="Tipster not found"
            description="This tipster may have been removed or the link is invalid."
            icon="👤"
            actionLabel="Browse Tipsters"
            actionHref="/(tabs)/tipsters"
          />
        </View>
      </>
    );
  }

  const t = profile.tipster;
  const showAvatar = t.avatar_url && !avatarError;
  const hasSettled = (t.total_wins ?? 0) + (t.total_losses ?? 0) > 0;
  const roiDisplay = hasSettled ? `${Number(t.roi).toFixed(2)}%` : '—';
  const winRateDisplay = hasSettled ? `${Number(t.win_rate).toFixed(1)}%` : '—';
  const coupons = profile.marketplace_coupons ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: t.display_name,
          headerShown: true,
          headerBackVisible: true,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchProfile(true)} colors={[colors.primary]} />
        }
      >
        <View style={styles.profile}>
          <View style={styles.avatarWrap}>
            {showAvatar ? (
              <Image
                source={{ uri: t.avatar_url! }}
                style={styles.avatar}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>{t.display_name?.charAt(0).toUpperCase() || '?'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{t.display_name}</Text>
          {t.leaderboard_rank != null && (
            <Text style={styles.rank}>Rank #{t.leaderboard_rank}</Text>
          )}
          {t.bio && <Text style={styles.bio}>{t.bio}</Text>}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>ROI</Text>
              <Text style={[styles.statValue, t.roi > 0 ? { color: colors.success } : t.roi < 0 ? { color: colors.error } : {}]}>
                {roiDisplay}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Win Rate</Text>
              <Text style={styles.statValue}>{winRateDisplay}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Picks</Text>
              <Text style={styles.statValue}>{t.total_predictions ?? 0}</Text>
            </View>
          </View>

          <Button
            title={followLoading ? '...' : profile.is_following ? 'Following' : 'Follow'}
            onPress={handleFollow}
            variant={profile.is_following ? 'outline' : 'primary'}
            fullWidth
            disabled={followLoading}
            style={styles.followBtn}
          />
        </View>

        <Text style={styles.sectionTitle}>Marketplace Picks</Text>
        {coupons.length === 0 ? (
          <EmptyState
            title="No picks yet"
            description="This tipster hasn't listed any picks on the marketplace."
            icon="📋"
          />
        ) : (
          coupons.map((item) => (
            <PickCard
              key={item.id}
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
              onPurchase={() => handlePurchase(item)}
              purchasing={purchasing === item.id}
              onView={() => {}}
            />
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl * 2 },
  error: { color: colors.error, padding: spacing.xl },
  profile: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 32, fontWeight: '700', color: colors.primary },
  name: {
    ...typography.titleSm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  rank: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  bio: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.xxl,
    marginBottom: spacing.lg,
  },
  stat: { alignItems: 'center' },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  followBtn: { maxWidth: 200 },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.lg,
  },
});
