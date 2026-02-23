import { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { API_BASE } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  sport?: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  news:               { bg: '#dbeafe', text: '#1d4ed8' },
  transfer_rumour:    { bg: '#fef3c7', text: '#92400e' },
  confirmed_transfer: { bg: '#d1fae5', text: '#065f46' },
  injury:             { bg: '#fee2e2', text: '#991b1b' },
  gossip:             { bg: '#ede9fe', text: '#5b21b6' },
};

const CATEGORY_LABELS: Record<string, string> = {
  news: 'News', transfer_rumour: 'Transfer Rumour',
  confirmed_transfer: 'Confirmed Transfer', injury: 'Injury Update', gossip: 'Gossip',
};

const SPORT_META: Record<string, { icon: string; label: string }> = {
  football: { icon: '⚽', label: 'Football' },
  basketball: { icon: '🏀', label: 'Basketball' },
  rugby: { icon: '🏉', label: 'Rugby' },
  mma: { icon: '🥊', label: 'MMA' },
  volleyball: { icon: '🏐', label: 'Volleyball' },
  hockey: { icon: '🏒', label: 'Hockey' },
  american_football: { icon: '🏈', label: 'American Football' },
  tennis: { icon: '🎾', label: 'Tennis' },
};

function formatDate(s: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function NewsArticlePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/news/${slug}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setArticle)
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Article</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Article</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📰</Text>
          <Text style={styles.emptyTitle}>Article not found</Text>
          <Text style={styles.emptySubtitle}>This article may have been removed.</Text>
          <Pressable style={styles.backToNewsBtn} onPress={() => router.back()}>
            <Text style={styles.backToNewsBtnText}>← Back to News</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const cat = CATEGORY_COLORS[article.category] ?? { bg: '#f3f4f6', text: '#374151' };
  const catLabel = CATEGORY_LABELS[article.category] ?? article.category;
  const sportMeta = article.sport ? SPORT_META[article.sport] : null;

  // Split content into paragraphs
  const paragraphs = (article.content || '').trim().split(/\n\n+/).filter(Boolean);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {article.title}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: cat.bg }]}>
            <Text style={[styles.categoryBadgeText, { color: cat.text }]}>{catLabel}</Text>
          </View>
          {sportMeta && (
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>{sportMeta.icon} {sportMeta.label}</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{article.title}</Text>

        {/* Date */}
        {article.publishedAt && (
          <Text style={styles.date}>{formatDate(article.publishedAt)}</Text>
        )}

        {/* Excerpt */}
        {article.excerpt && (
          <View style={styles.excerptContainer}>
            <Text style={styles.excerpt}>{article.excerpt}</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.contentBlock}>
          {paragraphs.length > 0 ? (
            paragraphs.map((para, idx) => (
              <Text key={idx} style={styles.paragraph}>{para}</Text>
            ))
          ) : (
            <Text style={styles.noContent}>Full article content is not available.</Text>
          )}
        </View>

        {/* Source link */}
        {article.sourceUrl && (
          <View style={styles.sourceContainer}>
            <Text style={styles.sourceLabel}>Source: </Text>
            <Pressable onPress={() => Linking.openURL(article.sourceUrl!)}>
              <Text style={styles.sourceLink} numberOfLines={2}>{article.sourceUrl}</Text>
            </Pressable>
          </View>
        )}

        {/* CTA — browse picks */}
        <Pressable
          style={styles.ctaCard}
          onPress={() => router.push('/(tabs)/marketplace' as never)}
        >
          <View>
            <Text style={styles.ctaTitle}>
              Follow {sportMeta?.label ?? 'sports'} tipsters
            </Text>
            <Text style={styles.ctaSubtitle}>
              Verified tipsters track these stories and turn them into picks.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#10b981" />
        </Pressable>
      </ScrollView>
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
  headerTitle: { ...typography.bodySm, color: colors.text, flex: 1, textAlign: 'center', fontWeight: '600' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl },
  backToNewsBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.primary, borderRadius: 12 },
  backToNewsBtnText: { color: '#fff', fontWeight: '700', ...typography.body },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxl * 2 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  categoryBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  categoryBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  sportBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.border,
  },
  sportBadgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },

  title: {
    ...typography.title,
    color: colors.text,
    lineHeight: 32,
    marginBottom: spacing.sm,
  },
  date: { ...typography.bodySm, color: colors.textMuted, marginBottom: spacing.lg },

  excerptContainer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.md,
    marginBottom: spacing.lg,
  },
  excerpt: {
    ...typography.body,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 24,
  },

  contentBlock: { marginBottom: spacing.xl },
  paragraph: {
    ...typography.body,
    color: colors.text,
    lineHeight: 26,
    marginBottom: spacing.md,
  },
  noContent: { ...typography.body, color: colors.textMuted, fontStyle: 'italic' },

  sourceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.xl,
    gap: 2,
  },
  sourceLabel: { ...typography.bodySm, color: colors.textMuted },
  sourceLink: { ...typography.bodySm, color: colors.primary, textDecorationLine: 'underline', flex: 1 },

  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f2b20',
    borderRadius: 14,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  ctaTitle: { ...typography.heading, color: '#34d399', marginBottom: 4 },
  ctaSubtitle: { ...typography.bodySm, color: '#6ee7b7', lineHeight: 18 },
});
