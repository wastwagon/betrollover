import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@/lib/api';

export default function RegisterScreen() {
  const [step, setStep] = useState<'email' | 'form'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSendOtp() {
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send code');
      setStep('form');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleRegister() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          username,
          displayName: displayName || username,
          dateOfBirth,
          password,
          confirmPassword: confirmPassword || password,
          otpCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      await AsyncStorage.setItem('token', data.access_token);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'email') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.form}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Verify your email first</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {otpError ? <Text style={styles.error}>{otpError}</Text> : null}
          <Pressable
            style={[styles.button, otpLoading && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={otpLoading || !email.trim()}
          >
            <Text style={styles.buttonText}>
              {otpLoading ? 'Sending...' : 'Send verification code'}
            </Text>
          </Pressable>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.link}>
                Already have an account? <Text style={styles.linkBold}>Sign In</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text style={styles.title}>Complete Registration</Text>
          <View style={styles.verifiedRow}>
            <Text style={styles.verifiedText}>Email: {email}</Text>
            <Pressable onPress={() => setStep('email')}>
              <Text style={styles.changeLink}>Change</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.input}
            placeholder="6-digit code from email"
            value={otpCode}
            onChangeText={(t) => setOtpCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Pressable
            onPress={handleSendOtp}
            disabled={otpLoading}
            style={styles.resendButton}
          >
            <Text style={styles.resendText}>
              {otpLoading ? 'Sending...' : 'Resend code'}
            </Text>
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Display Name (optional)"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 8 chars)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TextInput
            style={styles.input}
            placeholder="Date of birth (YYYY-MM-DD)"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={styles.dobHint}>You must be 18 or older to register</Text>
          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading || !otpCode || !dateOfBirth || password.length < 8 || password !== confirmPassword}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating...' : 'Create Account'}
            </Text>
          </Pressable>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.link}>
                Already have an account? <Text style={styles.linkBold}>Sign In</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  form: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  verifiedText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  changeLink: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  resendButton: {
    marginTop: -8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  resendText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '500',
  },
  dobHint: {
    fontSize: 12,
    color: '#666',
    marginTop: -8,
    marginBottom: 16,
  },
  error: {
    color: '#dc2626',
    marginBottom: 12,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  linkBold: {
    color: '#10b981',
    fontWeight: '600',
  },
});
