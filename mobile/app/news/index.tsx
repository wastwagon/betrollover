import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  TextInput, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { API_BASE } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  sport?: string;
  publishedAt: string | null;
}

type SportKey = 'all' | 'football' | 'basketball' | 'rugby' | 'mma' | 'volleyball' | 'hockey' | 'american_football' | 'tennis';
type CategoryKey = 'all' | 'news' | 'transfer_rumour' | 'confirmed_transfer' | 'injury' | 'gossip';

const SPORTS: { key: SportKey; icon: string; label: string }[] = [
  { key: 'all',               icon: '🌍', label: 'All' },
  { key: 'football',          icon: '⚽', label: 'Football' },
  { key: 'basketball',        icon: '🏀', label: 'Basketball' },
  { key: 'rugby',             icon: '🏉', label: 'Rugby' },
  { key: 'mma',               icon: '🥊', label: 'MMA' },
  { key: 'volleyball',        icon: '🏐', label: 'Volleyball' },
  { key: 'hockey',            icon: '🏒', label: 'Hockey' },
  { key: 'american_football', icon: '🏈', label: 'Amer. Football' },
  { key: 'tennis',            icon: '🎾', label: 'Tennis' },
];

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'all',               label: 'All' },
  { key: 'news',              label: 'News' },
  { key: 'transfer_rumour',   label: 'Rumours' },
  { key: 'confirmed_transfer', label: 'Transfers' },
  { key: 'injury',            label: 'Injuries' },
  { key: 'gossip',            label: 'Gossip' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  news:               { bg: '#dbeafe', text: '#1d4ed8' },
  transfer_rumour:    { bg: '#fef3c7', text: '#92400e' },
  confirmed_transfer: { bg: '#d1fae5', text: '#065f46' },
  injury:             { bg: '#fee2e2', text: '#991b1b' },
  gossip:             { bg: '#ede9fe', text: '#5b21b6' },
};

function formatDate(s: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function NewsListPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sport, setSport] = useState<SportKey>('all');
  const [category, setCategory] = useState<CategoryKey>('all');
  const [search, setSearch] = useState('');

  const fetchNews = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (sport !== 'all') params.set('sport', sport);
      if (category !== 'all') params.set('category', category);
      const res = await fetch(`${API_BASE}/news?${params}`);
      const data = await res.json();
      setArticles(Array.isArray(data) ? data : []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sport, category]);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  const filtered = articles.filter((a) =>
    !search || a.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: NewsArticle }) => {
    const cat = CATEGORY_COLORS[item.category] ?? { bg: '#f3f4f6', text: '#374151' };
    const sportMeta = SPORTS.find((s) => s.key === item.sport);
    return (
      <Pressable
        style={({ pressed }) => [styles.articleRow, pressed && styles.articleRowPressed]}
        onPress={() => router.push(`/news/${item.slug}` as never)}
      >
        <View style={styles.articleContent}>
          <View style={styles.articleBadgeRow}>
            <View style={[styles.categoryBadge, { backgroundColor: cat.bg }]}>
              <Text style={[styles.categoryBadgeText, { color: cat.text }]}>
                {CATEGORIES.find(c => c.key === item.category)?.label ?? item.category}
              </Text>
            </View>
            {sportMeta && sport === 'all' && (
              <Text style={styles.sportEmoji}>{sportMeta.icon}</Text>
            )}
          </View>
          <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
          {item.excerpt ? (
            <Text style={styles.articleExcerpt} numberOfLines={2}>{item.excerpt}</Text>
          ) : null}
          {item.publishedAt && (
            <Text style={styles.articleDate}>{formatDate(item.publishedAt)}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>📰 Sports News</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search articles…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Sport filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sportRow}
        style={styles.sportScroll}
      >
        {SPORTS.map((s) => (
          <Pressable
            key={s.key}
            style={[styles.sportChip, sport === s.key && styles.sportChipActive]}
            onPress={() => setSport(s.key)}
          >
            <Text style={[styles.sportChipText, sport === s.key && styles.sportChipTextActive]}>
              {s.icon} {s.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={styles.categoryScroll}
      >
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.key}
            style={[styles.categoryTab, category === c.key && styles.categoryTabActive]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={[styles.categoryTabText, category === c.key && styles.categoryTabTextActive]}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Article list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchNews(true)} tintColor={colors.primary} />
          }
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📰</Text>
              <Text style={styles.emptyTitle}>
                {search ? 'No results found' : 'No articles yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? 'Try a different search term or clear filters.'
                  : sport !== 'all'
                    ? `No ${SPORTS.find(s => s.key === sport)?.label ?? sport} news yet. Check back soon.`
                    : 'News articles will appear here once published.'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + 8,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: { ...typography.heading, color: colors.text, flex: 1, textAlign: 'center' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    height: 40,
    gap: 8,
  },
  searchIcon: {},
  searchInput: { flex: 1, ...typography.body, color: colors.text, height: 40 },

  sportScroll: { flexGrow: 0 },
  sportRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  sportChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  sportChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sportChipText: { ...typography.bodySm, color: colors.textMuted, fontWeight: '600' },
  sportChipTextActive: { color: '#fff' },

  categoryScroll: { flexGrow: 0 },
  categoryRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  categoryTabActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  categoryTabText: { ...typography.bodySm, color: colors.textMuted },
  categoryTabTextActive: { color: '#1d4ed8', fontWeight: '700' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: spacing.xxl * 2 },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg },

  articleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  articleRowPressed: { backgroundColor: colors.primaryLight },
  articleContent: { flex: 1 },
  articleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  categoryBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  sportEmoji: { fontSize: 13 },
  articleTitle: { ...typography.bodySm, color: colors.text, fontWeight: '600', lineHeight: 18, marginBottom: 3 },
  articleExcerpt: { ...typography.bodySm, color: colors.textMuted, fontSize: 12, lineHeight: 16, marginBottom: 3 },
  articleDate: { fontSize: 11, color: colors.textMuted },

  emptyContainer: { flex: 1 },
  emptyBox: { alignItems: 'center', paddingTop: spacing.xxl * 2, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
