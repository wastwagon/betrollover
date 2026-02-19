import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { colors, radius, spacing } from '@/lib/theme';

interface LoadingSkeletonProps {
  count?: number;
  variant?: 'list' | 'cards';
}

export function LoadingSkeleton({ count = 3, variant = 'list' }: LoadingSkeletonProps) {
  const isCards = variant === 'cards';
  return (
    <View style={isCards ? styles.cardGrid : styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.row}>
        <View style={styles.avatar} />
        <View style={styles.lineShort} />
      </View>
      <View style={styles.lineLong} />
      <View style={styles.lineMid} />
      <View style={styles.lineShort} />
      <View style={styles.lineShort} />
      <View style={styles.button} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.lg,
  },
  cardGrid: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.bgWarm,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  lineShort: {
    height: 12,
    width: '40%',
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  lineMid: {
    height: 12,
    width: '70%',
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  lineLong: {
    height: 14,
    width: '90%',
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  button: {
    height: 44,
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
});
