import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/lib/theme';

export default function HomeScreen() {
  useEffect(() => {
    AsyncStorage.getItem('token').then((token) => {
      if (token) router.replace('/(tabs)');
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BetRollover</Text>
      <Text style={styles.subtitle}>
        Your Shield Against Losses. Risk-free football betting tips.
      </Text>
      <View style={styles.buttons}>
        <Link href="/login" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </Pressable>
        </Link>
        <Link href="/register" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Get Started</Text>
          </Pressable>
        </Link>
      </View>
      <Text style={styles.footer}>BetRollover v2 — Ghana • GHS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttons: {
    gap: 12,
    width: '100%',
    maxWidth: 320,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    fontSize: 12,
    color: '#999',
  },
});
