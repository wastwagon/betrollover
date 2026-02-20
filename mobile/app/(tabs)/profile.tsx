import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Linking,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { API_BASE } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

interface User {
  displayName: string;
  email: string;
  username?: string;
  avatar?: string | null;
  emailVerifiedAt?: string | null;
  ageVerifiedAt?: string | null;
}

export default function ProfileTab() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const fetchUser = () => {
    AsyncStorage.getItem('token').then((token) => {
      if (!token) {
        router.replace('/');
        return;
      }
      fetch(`${API_BASE}/users/me`, {
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
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchUser();
    }, [user])
  );

  const openEditModal = () => {
    setEditName(user?.displayName ?? '');
    setEditModal(true);
  };

  const saveProfile = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: editName.trim() || user?.displayName }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setUser(updated);
      setEditModal(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  async function handleSignOut() {
    await AsyncStorage.removeItem('token');
    router.replace('/');
  }

  async function handleResendVerification() {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    setResendLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sent) {
        Alert.alert('Sent', data.message || 'Check your email for the verification link.');
      } else {
        Alert.alert('Error', data.message || 'Failed to send. Try again later.');
      }
    } catch {
      Alert.alert('Error', 'Failed to send verification email');
    } finally {
      setResendLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSkeleton count={2} variant="list" />
      </View>
    );
  }

  const avatarUrl = user?.avatar;
  const apiHost = API_BASE.replace('/api/v1', '');
  const fullAvatarUrl = avatarUrl?.startsWith('http') ? avatarUrl : avatarUrl ? `${apiHost}${avatarUrl}` : null;

  const needsVerification = user && !user.emailVerifiedAt;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      {needsVerification && (
        <View style={styles.verifyBanner}>
          <Ionicons name="mail-unread" size={24} color={colors.accent} />
          <View style={styles.verifyBannerText}>
            <Text style={styles.verifyBannerTitle}>Verify your email</Text>
            <Text style={styles.verifyBannerDesc}>
              Some features require a verified email. Check your inbox for the link.
            </Text>
          </View>
          <View style={styles.verifyBannerActions}>
            <Pressable
              onPress={() => router.push('/verify-email')}
              style={styles.verifyLink}
            >
              <Text style={styles.verifyLinkText}>Enter code</Text>
            </Pressable>
            <Pressable
              onPress={handleResendVerification}
              disabled={resendLoading}
              style={styles.verifyLink}
            >
              <Text style={styles.verifyLinkText}>{resendLoading ? 'Sending...' : 'Resend'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Card>
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            {fullAvatarUrl ? (
              <Image source={{ uri: fullAvatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {user?.displayName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{user?.displayName || '—'}</Text>
            <Pressable onPress={openEditModal} style={styles.editLink}>
              <Ionicons name="pencil" size={14} color={colors.primary} />
              <Text style={styles.editText}>Edit profile</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email || '—'}</Text>
        {user?.username && (
          <>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.value}>@{user.username}</Text>
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Account</Text>
        <Pressable
          onPress={() => router.push('/subscriptions')}
          style={styles.linkRow}
        >
          <Ionicons name="people" size={20} color={colors.primary} />
          <Text style={styles.linkText}>Subscriptions</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/notifications')}
          style={styles.linkRow}
        >
          <Ionicons name="notifications" size={20} color={colors.primary} />
          <Text style={styles.linkText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Legal</Text>
        <Pressable onPress={() => Linking.openURL('https://betrollover.com/terms')} style={styles.linkRow}>
          <Text style={styles.linkText}>Terms of Service</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL('https://betrollover.com/privacy')} style={styles.linkRow}>
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/responsible-gambling')} style={styles.linkRow}>
          <Text style={styles.linkText}>Responsible Gambling</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </Card>

      <Pressable
        style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
        onPress={handleSignOut}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <Modal visible={editModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Text style={styles.modalLabel}>Display Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Display name"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={() => setEditModal(false)} style={styles.modalBtn} />
              <Button title={saving ? 'Saving...' : 'Save'} onPress={saveProfile} loading={saving} style={styles.modalBtn} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl * 2 },
  title: {
    ...typography.titleSm,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  verifyBannerText: { flex: 1, minWidth: 0, marginLeft: spacing.sm },
  verifyBannerTitle: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.text,
  },
  verifyBannerDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  verifyBannerActions: { flexDirection: 'row', gap: spacing.sm },
  verifyLink: { paddingVertical: 4, paddingHorizontal: 8 },
  verifyLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 24, fontWeight: '700', color: colors.primary },
  profileInfo: { flex: 1 },
  displayName: {
    ...typography.heading,
    color: colors.text,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  editText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  linkText: {
    ...typography.body,
    color: colors.primary,
    flex: 1,
  },
  signOut: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  signOutPressed: { opacity: 0.8 },
  signOutText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalBtn: { flex: 1 },
});
