import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Button } from '@/components/Button';
import { API_BASE } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? '');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const t = params.token?.trim();
    if (t) {
      setToken(t);
      setLoading(true);
      fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(t)}`)
        .then((res) => res.json().catch(() => ({})))
        .then((data) => {
          if (data?.verified) {
            setVerified(true);
            setMessage(data.message || 'Email verified!');
          } else {
            setVerified(false);
            setMessage(data?.message || 'Invalid or expired link.');
          }
        })
        .catch(() => {
          setVerified(false);
          setMessage('Verification failed. Check your connection.');
        })
        .finally(() => setLoading(false));
    }
  }, [params.token]);

  async function handleVerify(verifyToken: string) {
    if (!verifyToken.trim()) {
      setMessage('Enter the verification code from your email');
      return;
    }
    setLoading(true);
    setVerified(null);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(verifyToken.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.verified) {
        setVerified(true);
        setMessage(data.message || 'Email verified! You can now use all features.');
      } else {
        setVerified(false);
        setMessage(data.message || 'Invalid or expired link. Request a new one from Profile.');
      }
    } catch {
      setVerified(false);
      setMessage('Verification failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Verify Email', headerShown: true, headerBackVisible: true }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            Enter the verification code from the email we sent you, or use the link from the email.
          </Text>

          {verified === true ? (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>{message}</Text>
              <Button
                title="Go to Profile"
                onPress={() => router.replace('/(tabs)/profile')}
                style={styles.successBtn}
              />
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Paste verification code or token"
                placeholderTextColor={colors.textMuted}
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              {message ? (
                <Text style={[styles.message, verified === false && styles.messageError]}>{message}</Text>
              ) : null}
              <Button
                title={loading ? 'Verifying...' : 'Verify'}
                onPress={() => handleVerify(token)}
                loading={loading}
                fullWidth
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  title: {
    ...typography.titleSm,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
  },
  message: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  messageError: {
    color: colors.error,
  },
  successBox: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  successIcon: {
    fontSize: 48,
    color: colors.success,
    marginBottom: spacing.md,
  },
  successText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  successBtn: {
    minWidth: 200,
  },
});
