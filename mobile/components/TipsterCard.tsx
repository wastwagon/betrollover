import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { Button } from './Button';

export interface TipsterCardData {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  roi: number;
  win_rate: number;
  current_streak: number;
  total_predictions?: number;
  total_wins?: number;
  total_losses?: number;
  leaderboard_rank?: number | null;
  follower_count?: number;
  is_following?: boolean;
}

interface TipsterCardProps {
  tipster: TipsterCardData;
  onFollow?: () => void;
  followLoading?: boolean;
}

export function TipsterCard({ tipster, onFollow, followLoading = false }: TipsterCardProps) {
  const [avatarError, setAvatarError] = useState(false);
  const showAvatar = tipster.avatar_url && !avatarError;
  const hasSettledPicks = ((tipster.total_wins ?? 0) + (tipster.total_losses ?? 0)) > 0;
  const roiDisplay = hasSettledPicks ? `${Number(tipster.roi).toFixed(2)}%` : '—';
  const winRateDisplay = hasSettledPicks ? `${Number(tipster.win_rate).toFixed(1)}%` : '—';
  const roiColor = tipster.roi > 0 ? colors.success : tipster.roi < 0 ? colors.error : colors.text;

  return (
    <View style={styles.card}>
      <Link href={`/tipsters/${tipster.username}`} asChild>
        <Pressable style={styles.header}>
          <View style={styles.avatarWrap}>
            {showAvatar ? (
              <Image
                source={{ uri: tipster.avatar_url! }}
                style={styles.avatar}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {tipster.display_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {tipster.display_name}
            </Text>
            <View style={styles.meta}>
              {tipster.leaderboard_rank != null && (
                <Text style={styles.metaText}>Rank #{tipster.leaderboard_rank}</Text>
              )}
              {tipster.follower_count != null && tipster.follower_count > 0 && (
                <Text style={styles.metaText}>
                  {tipster.follower_count} follower{tipster.follower_count !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </View>
        </Pressable>
      </Link>

      {tipster.bio && (
        <Text style={styles.bio} numberOfLines={2}>
          {tipster.bio}
        </Text>
      )}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>ROI</Text>
          <Text style={[styles.statValue, { color: roiColor }]}>{roiDisplay}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Win Rate</Text>
          <Text style={styles.statValue}>{winRateDisplay}</Text>
        </View>
      </View>

      {onFollow && (
        <Button
          title={followLoading ? '...' : tipster.is_following ? 'Following' : 'Follow'}
          onPress={onFollow}
          variant={tipster.is_following ? 'outline' : 'primary'}
          fullWidth
          disabled={followLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  meta: { flexDirection: 'row', gap: spacing.sm, marginTop: 2 },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  bio: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  stat: {},
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
});
