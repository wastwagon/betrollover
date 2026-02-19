import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_BASE } from '@/lib/api';

export interface AuthUser {
  id: number;
  displayName: string;
  email: string;
  username?: string;
  avatar?: string | null;
  role?: string;
  emailVerifiedAt?: string | null;
}

interface UseAuthResult {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      setUser(data);
      setError(null);
    } catch (e) {
      setUser(null);
      setError(e instanceof Error ? e.message : 'Failed to load user');
      await AsyncStorage.removeItem('token');
      setToken(null);
    }
  }, []);

  const refetch = useCallback(async () => {
    const t = await AsyncStorage.getItem('token');
    if (!t) {
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }
    setToken(t);
    setLoading(true);
    await fetchUser(t);
    setLoading(false);
  }, [fetchUser]);

  useEffect(() => {
    AsyncStorage.getItem('token').then((t) => {
      if (!t) {
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }
      setToken(t);
      fetchUser(t).finally(() => setLoading(false));
    });
  }, [fetchUser]);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
    router.replace('/');
  }, []);

  return { token, user, loading, error, signOut, refetch };
}
