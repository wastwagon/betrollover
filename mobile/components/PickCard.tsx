import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { Button } from './Button';

interface Pick {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string | Date;
  homeScore?: number | null;
  awayScore?: number | null;
  fixtureStatus?: string | null;
  result?: string;
}

interface Tipster {
  id?: number;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  winRate: number;
  totalPicks: number;
  rank: number;
}

const SPORT_META: Record<string, { icon: string; label: string }> = {
  football:          { icon: '⚽', label: 'Football' },
  basketball:        { icon: '🏀', label: 'Basketball' },
  rugby:             { icon: '🏉', label: 'Rugby' },
  mma:               { icon: '🥊', label: 'MMA' },
  volleyball:        { icon: '🏐', label: 'Volleyball' },
  hockey:            { icon: '🏒', label: 'Hockey' },
  american_football: { icon: '🏈', label: 'Amer. Football' },
  tennis:            { icon: '🎾', label: 'Tennis' },
  'multi-sport':     { icon: '🌍', label: 'Multi-Sport' },
  multi:             { icon: '🌍', label: 'Multi-Sport' },
};

interface PickCardProps {
  id: number;
  title: string;
  totalPicks: number;
  totalOdds: number;
  price: number;
  sport?: string;
  status?: string;
  result?: string;
  picks: Pick[];
  purchaseCount?: number;
  tipster?: Tipster | null;
  isPurchased?: boolean;
  canPurchase?: boolean;
  walletBalance?: number | null;
  onPurchase: () => void;
  purchasing?: boolean;
  onView?: () => void;
}

export function PickCard({
  id,
  title,
  totalPicks,
  totalOdds,
  price,
  sport,
  status,
  result,
  picks,
  purchaseCount,
  tipster,
  isPurchased = false,
  canPurchase = true,
  walletBalance,
  onPurchase,
  purchasing = false,
  onView,
}: PickCardProps) {
  const sportMeta = sport ? (SPORT_META[sport.toLowerCase()] ?? null) : null;
  const isFree = price === 0;
  const showFullDetails = isFree || isPurchased;

  const displayStatus = result && ['won', 'lost', 'void'].includes(result) ? result : status;
  const statusColors: Record<string, string> = {
    pending_approval: colors.accentLight,
    active: colors.primaryLight,
    won: colors.primaryLight,
    lost: colors.errorLight,
    cancelled: colors.border,
    void: colors.border,
  };
  const statusColor = displayStatus ? statusColors[displayStatus] || colors.border : '';

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <View style={styles.card}>
      {/* Tipster header */}
      {(tipster || title) && (
        <View style={styles.tipsterRow}>
          {tipster?.avatarUrl ? (
            <Image source={{ uri: tipster.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>
                {tipster ? (tipster.rank <= 3 ? getRankIcon(tipster.rank) : tipster.rank) : '?'}
              </Text>
            </View>
          )}
          <View style={styles.tipsterInfo}>
            <Text style={styles.tipsterName} numberOfLines={1}>
              {tipster?.displayName || 'Tipster'}
            </Text>
            <Text style={styles.tipsterStats}>
              {tipster ? `${tipster.totalPicks}p • ${tipster.winRate.toFixed(1)}%` : `${totalPicks}p`}
            </Text>
          </View>
          {purchaseCount !== undefined && purchaseCount > 0 && (
            <Text style={styles.purchaseCount}>{purchaseCount} bought</Text>
          )}
        </View>
      )}

      {/* Title & summary */}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {totalPicks} picks • {Number(totalOdds).toFixed(2)} odds
        </Text>
        <View style={styles.metaBadges}>
          {sportMeta && (
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>{sportMeta.icon} {sportMeta.label}</Text>
            </View>
          )}
          {displayStatus && (
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{displayStatus.replace(/_/g, ' ')}</Text>
            </View>
          )}
        </View>
      </View>
      {price > 0 && (
        <Text style={styles.price}>GHS {Number(price).toFixed(2)}</Text>
      )}

      {/* Pick details (free or purchased) */}
      {showFullDetails && picks.length > 0 ? (
        <View style={styles.picksList}>
          {picks.slice(0, 3).map((p, i) => {
            const hasScore = p.homeScore != null && p.awayScore != null;
            const pickSettled = ['won', 'lost'].includes(p.result || '');
            return (
              <View key={i} style={styles.pickRow}>
                <Text style={styles.pickMatch} numberOfLines={1}>{p.matchDescription}</Text>
                <Text style={styles.pickOdds}>
                  {p.prediction} @ {Number(p.odds || 0).toFixed(2)}
                </Text>
                {(hasScore || p.result) && (
                  <Text style={styles.pickResult}>
                    {hasScore ? `${p.homeScore}-${p.awayScore}` : ''}
                    {p.result ? ` ${p.result}` : ''}
                  </Text>
                )}
              </View>
            );
          })}
          {picks.length > 3 && (
            <Text style={styles.morePicks}>+{picks.length - 3} more</Text>
          )}
        </View>
      ) : (
        <View style={styles.locked}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedText}>Purchase to view details</Text>
        </View>
      )}

      {/* Action */}
      <View style={styles.action}>
        {isPurchased || isFree ? (
          <Button
            title="View"
            onPress={onView ?? (() => {})}
            variant="primary"
            fullWidth
          />
        ) : canPurchase ? (
          <Button
            title={purchasing ? 'Processing...' : 'Purchase'}
            onPress={onPurchase}
            loading={purchasing}
            variant="accent"
            fullWidth
          />
        ) : (
          <Link href="/(tabs)/wallet" asChild>
            <Pressable style={styles.topUpButton}>
              <Text style={styles.topUpText}>Top Up Wallet</Text>
            </Pressable>
          </Link>
        )}
      </View>
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
  tipsterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  tipsterInfo: { flex: 1, minWidth: 0 },
  tipsterName: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.text,
  },
  tipsterStats: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  purchaseCount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  metaBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  sportBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.bgWarm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  picksList: { marginBottom: spacing.md },
  pickRow: {
    marginBottom: spacing.sm,
  },
  pickMatch: {
    fontSize: 13,
    color: colors.text,
  },
  pickOdds: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  pickResult: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
  },
  morePicks: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  locked: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgWarm,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  lockedIcon: { fontSize: 24, marginBottom: spacing.sm },
  lockedText: { fontSize: 12, color: colors.textMuted },
  action: { marginTop: spacing.sm },
  topUpButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  topUpText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
