import { Pressable, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { colors, radius, spacing, typography, TOUCH_TARGET_MIN } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  /** Shown when loading (e.g. "Saving..."). Defaults to title + "ing..." for short verbs */
  loadingLabel?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  loadingLabel,
  fullWidth,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const displayText = loading
    ? (loadingLabel ?? (title.endsWith('...') ? title : `${title.replace(/\s*\.{3}$/, '')}...`))
    : title;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && pressedStyles[variant],
        style,
      ]}
    >
      <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>
        {displayText}
      </Text>
    </Pressable>
  );
}

const pressedStyles: Record<Variant, ViewStyle> = {
  primary: { opacity: 0.9 },
  secondary: { opacity: 0.9 },
  outline: { opacity: 0.8 },
  ghost: { backgroundColor: colors.border },
  accent: { opacity: 0.9 },
};

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH_TARGET_MIN,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primaryLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  accent: {
    backgroundColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    ...typography.body,
    fontWeight: '600',
  },
  text_primary: {
    color: '#fff',
  },
  text_secondary: {
    color: colors.primary,
  },
  text_outline: {
    color: colors.primary,
  },
  text_accent: {
    color: '#fff',
  },
  text_ghost: {
    color: colors.primary,
  },
});
