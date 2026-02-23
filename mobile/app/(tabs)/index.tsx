import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Card } from '@/components/Card';
import { API_BASE } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

async function registerPushToken(token: string, apiBase: string) {
  if (!Device.isDevice) return;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return;
  const pushToken = (await Notifications.getExpoPushTokenAsync()).data;
  await fetch(`${apiBase}/notifications/push/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ platform: Platform.OS, token: pushToken }),
  });
}

interface NewsHeadline {
  id: number;
  slug: string;
  title: string;
  category: string;
  sport?: string;
  publishedAt: string | null;
}

const SPORTS = [
  { key: 'football',          icon: '⚽', label: 'Football' },
  { key: 'basketball',        icon: '🏀', label: 'Basketball' },
  { key: 'rugby',             icon: '🏉', label: 'Rugby' },
  { key: 'mma',               icon: '🥊', label: 'MMA' },
  { key: 'volleyball',        icon: '🏐', label: 'Volleyball' },
  { key: 'hockey',            icon: '🏒', label: 'Hockey' },
  { key: 'american_football', icon: '🏈', label: 'Amer. Football' },
  { key: 'tennis',            icon: '🎾', label: 'Tennis' },
];

function formatDate(s: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const CATEGORY_LABELS: Record<string, string> = {
  news:               'News',
  transfer_rumour:    'Rumour',
  confirmed_transfer: 'Transfer',
  injury:             'Injury',
  gossip:             'Gossip',
};

export default function HomeTab() {
  const [user, setUser] = useState<{ displayName: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('token').then((token) => {
      if (!token) {
        router.replace('/');
        return;
      }
      fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Unauthorized');
          return res.json();
        })
        .then((u) => {
          setUser(u);
          registerPushToken(token, API_BASE).catch(() => {});
        })
        .catch(() => {
          AsyncStorage.removeItem('token');
          router.replace('/');
        })
        .finally(() => setLoading(false));
    });
  }, []);

  // Fetch latest news headlines
  useEffect(() => {
    fetch(`${API_BASE}/news?limit=4`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setHeadlines(Array.isArray(data) ? data : []))
      .catch(() => setHeadlines([]))
      .finally(() => setNewsLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSkeleton count={2} variant="list" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.title}>Welcome, {user?.displayName || 'User'}!</Text>
      <Text style={styles.subtitle}>Your multi-sport tipster marketplace</Text>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          onPress={() => router.push('/(tabs)/marketplace')}
        >
          <Ionicons name="storefront" size={28} color={colors.primary} />
          <Text style={styles.actionTitle}>Marketplace</Text>
          <Text style={styles.actionDesc}>Browse & buy picks</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <Ionicons name="wallet" size={28} color={colors.primary} />
          <Text style={styles.actionTitle}>Wallet</Text>
          <Text style={styles.actionDesc}>Deposit & withdraw</Text>
        </Pressable>
      </View>
      <View style={styles.quickActions}>
        <Pressable
          style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          onPress={() => router.push('/my-picks')}
        >
          <Ionicons name="document-text" size={28} color={colors.primary} />
          <Text style={styles.actionTitle}>My Picks</Text>
          <Text style={styles.actionDesc}>Your created picks</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          onPress={() => router.push('/my-purchases')}
        >
          <Ionicons name="bag" size={28} color={colors.primary} />
          <Text style={styles.actionTitle}>My Purchases</Text>
          <Text style={styles.actionDesc}>Purchased picks</Text>
        </Pressable>
      </View>
      <View style={styles.quickActions}>
        <Pressable
          style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          onPress={() => router.push('/(tabs)/tipsters')}
        >
          <Ionicons name="people" size={28} color={colors.primary} />
          <Text style={styles.actionTitle}>Tipsters</Text>
          <Text style={styles.actionDesc}>Browse & follow</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          onPress={() => router.push('/leaderboard')}
        >
          <Ionicons name="trophy" size={28} color={colors.primary} />
          <Text style={styles.actionTitle}>Leaderboard</Text>
          <Text style={styles.actionDesc}>Top performers</Text>
        </Pressable>
      </View>

      {/* Sport filter — tappable chips navigate to marketplace */}
      <View style={styles.sportsBanner}>
        <View style={styles.sportsBannerHeader}>
          <Text style={styles.sportsBannerTitle}>🌍 8 Sports Covered</Text>
          <Pressable onPress={() => router.push('/(tabs)/marketplace')}>
            <Text style={styles.sportsBannerLink}>Browse all →</Text>
          </Pressable>
        </View>
        <Text style={styles.sportsBannerSub}>Tap a sport to browse its picks</Text>
        <View style={styles.sportsRow}>
          {SPORTS.map((s) => (
            <Pressable
              key={s.key}
              style={({ pressed }) => [styles.sportChip, pressed && styles.sportChipPressed]}
              onPress={() => router.push(`/(tabs)/marketplace?sport=${s.key}` as never)}
            >
              <Text style={styles.sportChipIcon}>{s.icon}</Text>
              <Text style={styles.sportChipLabel}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Latest news headlines */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📰 Latest News</Text>
        <Pressable onPress={() => router.push('/news' as never)}>
          <Text style={styles.sectionLink}>View all →</Text>
        </Pressable>
      </View>

      {newsLoading ? (
        <View style={styles.newsLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : headlines.length === 0 ? (
        <Card style={styles.newsEmptyCard}>
          <Text style={styles.newsEmptyText}>No news available yet. Check back soon.</Text>
        </Card>
      ) : (
        <View style={styles.newsList}>
          {headlines.map((h) => (
            <Pressable
              key={h.id}
              style={({ pressed }) => [styles.newsItem, pressed && styles.newsItemPressed]}
              onPress={() => router.push(`/news/${h.slug}` as never)}
            >
              <View style={styles.newsItemLeft}>
                <View style={styles.newsBadgeRow}>
                  <View style={styles.newsBadge}>
                    <Text style={styles.newsBadgeText}>
                      {CATEGORY_LABELS[h.category] ?? h.category}
                    </Text>
                  </View>
                  {h.sport && (
                    <Text style={styles.newsSport}>
                      {SPORTS.find(s => s.key === h.sport)?.icon ?? '🌍'}
                    </Text>
                  )}
                </View>
                <Text style={styles.newsTitle} numberOfLines={2}>{h.title}</Text>
                {h.publishedAt && (
                  <Text style={styles.newsDate}>{formatDate(h.publishedAt)}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Platform info card */}
      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>Escrow-protected picks</Text>
        <Text style={styles.infoText}>
          Purchase picks from verified tipsters across 8 sports. Your coupon purchase is automatically refunded if tips lose.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl * 2 },

  title: { ...typography.title, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.xl },

  quickActions: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xl },
  actionCard: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionCardPressed: { opacity: 0.85 },
  actionTitle: { ...typography.heading, color: colors.text, marginTop: spacing.sm },
  actionDesc: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs },

  // Sports banner — now interactive
  sportsBanner: {
    backgroundColor: '#0f2b20',
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#10b98130',
  },
  sportsBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sportsBannerTitle: { ...typography.heading, color: '#34d399' },
  sportsBannerLink: { ...typography.bodySm, color: '#34d399', fontWeight: '700' },
  sportsBannerSub: { ...typography.bodySm, color: '#6ee7b7', marginBottom: spacing.md },
  sportsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#065f46',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  sportChipPressed: { opacity: 0.75, backgroundColor: '#047857' },
  sportChipIcon: { fontSize: 13 },
  sportChipLabel: { ...typography.bodySm, color: '#d1fae5', fontWeight: '700', fontSize: 12 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.heading, color: colors.text },
  sectionLink: { ...typography.bodySm, color: colors.primary, fontWeight: '700' },

  // News
  newsLoading: { alignItems: 'center', paddingVertical: spacing.xl },
  newsEmptyCard: { marginBottom: spacing.xl },
  newsEmptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  newsList: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: spacing.xl,
  },
  newsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  newsItemPressed: { backgroundColor: colors.primaryLight },
  newsItemLeft: { flex: 1 },
  newsBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  newsBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newsBadgeText: { fontSize: 10, fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase' },
  newsSport: { fontSize: 13 },
  newsTitle: { ...typography.bodySm, color: colors.text, fontWeight: '600', lineHeight: 18 },
  newsDate: { ...typography.bodySm, color: colors.textMuted, fontSize: 11, marginTop: 2 },

  // Info card
  infoCard: { marginTop: 0 },
  infoTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  infoText: { ...typography.body, color: colors.textMuted, lineHeight: 24 },
});

