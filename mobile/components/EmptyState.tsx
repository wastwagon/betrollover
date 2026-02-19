import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { colors, radius, spacing, typography } from '@/lib/theme';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  actionHref?: string;
  onActionPress?: () => void;
}

export function EmptyState({
  title,
  description,
  icon = '📋',
  actionLabel,
  actionHref,
  onActionPress,
}: EmptyStateProps) {
  const hasAction = actionLabel && (actionHref || onActionPress);

  return (
    <View style={styles.container}>
      <Text style={styles.icon} accessibilityRole="image" accessibilityLabel={title}>
        {icon}
      </Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {hasAction &&
        (actionHref ? (
          <Link href={actionHref} asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>{actionLabel}</Text>
            </Pressable>
          </Link>
        ) : (
          <Pressable style={styles.button} onPress={onActionPress}>
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </Pressable>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.titleSm,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
    color: '#fff',
  },
});
