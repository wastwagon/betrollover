import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6001';

export default function DashboardScreen() {
  const [user, setUser] = useState<{ displayName: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('token').then((token) => {
      if (!token) {
        router.replace('/');
        return;
      }
      fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Unauthorized');
          return res.json();
        })
        .then(setUser)
        .catch(() => {
          AsyncStorage.removeItem('token');
          router.replace('/');
        })
        .finally(() => setLoading(false));
    });
  }, []);

  async function handleSignOut() {
    await AsyncStorage.removeItem('token');
    router.replace('/');
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.displayName || 'User'}!</Text>
      <Text style={styles.role}>Role: {user?.role}</Text>
      <Pressable style={styles.walletButton} onPress={() => router.push('/wallet')}>
        <Text style={styles.walletButtonText}>Wallet</Text>
      </Pressable>
      <Pressable style={styles.signOut} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  loading: {
    textAlign: 'center',
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  role: {
    color: '#666',
    marginBottom: 24,
  },
  walletButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  walletButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOut: {
    alignSelf: 'flex-start',
  },
  signOutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
});
