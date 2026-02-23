import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Share, RefreshControl, Clipboard,
} from 'react-native';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@/lib/api';
import { colors, spacing } from '@/lib/theme';

interface Conversion {
  id: number;
  referredUser: { displayName: string; username: string } | null;
  rewardAmount: number;
  rewardCredited: boolean;
  firstPurchaseAt: string | null;
  joinedAt: string;
}
interface ReferralStats {
  code: string;
  totalReferrals: number;
  totalCredited: number;
  rewardPerReferral: number;
  conversions: Conversion[];
}

const WEB_BASE = 'https://betrollover.com'; // update in production env

export default function InviteScreen() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }
    try {
      const r = await fetch(`${API_BASE}/referrals/my`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setStats(await r.json());
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    Clipboard.setString(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2500);
  };

  const shareCode = async () => {
    if (!stats) return;
    await Share.share({
      message: `Join me on BetRollover — the AI-powered tipster marketplace! Use my referral code ${stats.code} when signing up.\n${WEB_BASE}/register?ref=${stats.code}`,
      title: 'Invite to BetRollover',
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Invite & Earn', headerBackTitle: 'Back' }} />
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Invite & Earn', headerBackTitle: 'Back' }} />
        <Text style={styles.loading}>Could not load referral data.</Text>
      </View>
    );
  }

  const shareUrl = `${WEB_BASE}/register?ref=${stats.code}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}>
      <Stack.Screen options={{ title: 'Invite & Earn', headerBackTitle: 'Back' }} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invite Friends & Earn</Text>
        <Text style={styles.headerSubtitle}>
          Share your code. When a friend makes their first purchase you earn{' '}
          <Text style={styles.highlight}>GHS {Number(stats.rewardPerReferral).toFixed(2)}</Text> automatically.
        </Text>
      </View>

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalReferrals}</Text>
          <Text style={styles.statLabel}>Invites</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>GHS {Number(stats.rewardPerReferral).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Per invite</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            GHS {Number(stats.totalCredited).toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>
      </View>

      {/* Referral code */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your Referral Code</Text>
        <View style={styles.codeRow}>
          <Text style={styles.code}>{stats.code}</Text>
          <Pressable style={styles.copyBtn} onPress={() => copyToClipboard(stats.code, 'code')}>
            <Text style={styles.copyBtnText}>{copied === 'code' ? '✓ Copied' : 'Copy'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Share link */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Share Link</Text>
        <Text style={styles.linkText} numberOfLines={1}>{shareUrl}</Text>
        <View style={styles.actionRow}>
          <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => copyToClipboard(shareUrl, 'link')}>
            <Text style={styles.btnOutlineText}>{copied === 'link' ? '✓ Copied' : 'Copy Link'}</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={shareCode}>
            <Text style={styles.btnPrimaryText}>Share</Text>
          </Pressable>
        </View>
      </View>

      {/* How it works */}
      <View style={[styles.card, styles.howCard]}>
        <Text style={styles.cardLabel}>How It Works</Text>
        {[
          ['1', 'Share your referral link or code with a friend.'],
          ['2', 'They sign up using your code at registration.'],
          ['3', 'When they make their first purchase you earn automatically.'],
          ['4', 'Reward is instantly credited to your wallet.'],
        ].map(([step, text]) => (
          <View key={step} style={styles.howRow}>
            <View style={styles.howBadge}><Text style={styles.howBadgeText}>{step}</Text></View>
            <Text style={styles.howText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* Conversions */}
      {stats.conversions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Your Referrals</Text>
          {stats.conversions.map((c) => (
            <View key={c.id} style={styles.convRow}>
              <View style={styles.convInfo}>
                <Text style={styles.convName}>{c.referredUser?.displayName ?? 'User'}</Text>
                <Text style={styles.convDate}>
                  Joined {new Date(c.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {c.firstPurchaseAt && ` · Purchased ${new Date(c.firstPurchaseAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                </Text>
              </View>
              <Text style={[styles.convReward, c.rewardCredited ? styles.rewardPaid : styles.rewardPending]}>
                {c.rewardCredited ? `+GHS ${Number(c.rewardAmount).toFixed(2)}` : 'Pending'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background },
  content:    { padding: spacing.md, paddingBottom: 80 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loading:    { color: colors.textMuted, fontSize: 14 },
  header:     { marginBottom: spacing.md },
  headerTitle:    { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6 },
  headerSubtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  highlight:      { color: colors.success, fontWeight: '700' },
  statsRow:   { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard:   { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statValue:  { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
  statLabel:  { fontSize: 10, color: colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:       { backgroundColor: colors.card, borderRadius: 18, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardLabel:  { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
  codeRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code:       { fontSize: 28, fontWeight: '900', color: colors.primary, letterSpacing: 4, fontVariant: ['tabular-nums'] },
  copyBtn:    { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  copyBtnText:{ color: '#fff', fontSize: 12, fontWeight: '700' },
  linkText:   { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
  actionRow:  { flexDirection: 'row', gap: spacing.sm },
  btn:        { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary },
  btnOutlineText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  howCard:    { backgroundColor: '#f0fdf4' },
  howRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  howBadge:   { width: 24, height: 24, borderRadius: 12, backgroundColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  howBadgeText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  howText:    { flex: 1, fontSize: 13, color: '#166534', lineHeight: 18 },
  convRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  convInfo:   { flex: 1 },
  convName:   { fontSize: 13, fontWeight: '600', color: colors.text },
  convDate:   { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  convReward: { fontSize: 13, fontWeight: '700' },
  rewardPaid:    { color: colors.success },
  rewardPending: { color: colors.textMuted },
});
