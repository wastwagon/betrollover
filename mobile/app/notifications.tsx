import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { API_BASE } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id: number) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // ignore
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Notifications', headerShown: true, headerBackVisible: true }} />
      <View style={styles.container}>
        {loading ? (
          <LoadingSkeleton count={4} variant="list" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="When you get updates on your picks, purchases, or subscriptions, they'll appear here."
            icon="🔔"
            actionLabel="Go to Home"
            actionHref="/(tabs)"
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={[styles.card, !item.isRead && styles.cardUnread]}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMessage}>{item.message}</Text>
                  <Text style={styles.cardDate}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
                {!item.isRead && (
                  <Pressable
                    onPress={() => markRead(item.id)}
                    style={styles.markReadBtn}
                  >
                    <Text style={styles.markReadText}>Mark read</Text>
                  </Pressable>
                )}
              </View>
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchNotifications(true)}
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  cardMessage: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 4,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  markReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
