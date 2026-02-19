'use client';

import { useState, useCallback, useEffect } from 'react';
import { getApiUrl } from '@/lib/site-config';

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const register = useCallback(async () => {
    if (!supported) {
      setError('Push not supported');
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Sign in to enable notifications');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await new Promise((r) => setTimeout(r, 500));
      }
      const apiUrl = getApiUrl();
      const keyRes = await fetch(`${apiUrl}/notifications/push/vapid-public-key`);
      const { vapidPublicKey } = await keyRes.json();
      if (!vapidPublicKey) {
        setError('Server push not configured');
        setLoading(false);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
      const subJson = JSON.stringify(sub.toJSON());
      const res = await fetch(`${apiUrl}/notifications/push/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ platform: 'web', token: subJson }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Register failed');
      }
      setRegistered(true);
      setPermission(Notification.permission);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const requestAndRegister = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      await register();
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') await register();
    else setError('Permission denied');
  }, [register]);

  return { supported, permission, registered, loading, error, register, requestAndRegister };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
