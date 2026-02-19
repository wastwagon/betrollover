import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
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
    body: JSON.stringify({
      platform: Platform.OS,
      token: pushToken,
    }),
  });
}

export default function HomeTab() {
  const [user, setUser] = useState<{ displayName: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSkeleton count={2} variant="list" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome, {user?.displayName || 'User'}!</Text>
      <Text style={styles.subtitle}>Your Shield Against Losses</Text>

      <View style={styles.quickActions}>
        <Pressable
          style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          onPress={() => router.push('/(tabs)/marketplace')}
        >
          <Ionicons name="storefront" size={28} color={colors.primary} />
          <Text style={styles.actionTitle}>Marketplace</Text>
          <Text style={styles.actionDesc}>Browse & purchase picks</Text>
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

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>Risk-free football tips</Text>
        <Text style={styles.infoText}>
          Purchase picks from verified tipsters. Win or get your money back with escrow protection.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl * 2 },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionCardPressed: { opacity: 0.9 },
  actionTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.sm,
  },
  actionDesc: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  infoCard: {
    marginTop: spacing.lg,
  },
  infoTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 24,
  },
});
