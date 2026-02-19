import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, router } from 'expo-router';
import { API_BASE } from '@/lib/api';
import { Button } from '@/components/Button';
import { colors, spacing, typography } from '@/lib/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!email.trim()) {
      setError('Enter your email');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send reset link');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.form}>
          <Text style={styles.successIcon}>✉️</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a password reset link to {email}. Click the link to set a new password.
          </Text>
          <Link href="/login" asChild>
            <Pressable style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Back to Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Send reset link"
          onPress={handleSubmit}
          loading={loading}
          fullWidth
        />
        <Link href="/login" asChild>
          <Pressable>
            <Text style={styles.link}>
              Back to <Text style={styles.linkBold}>Sign In</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  form: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  successIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.titleSm,
    textAlign: 'center',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: spacing.lg,
    fontSize: 16,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.md,
    fontSize: 14,
  },
  link: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xl,
  },
  linkBold: {
    color: colors.primary,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: spacing.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  linkButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
});
