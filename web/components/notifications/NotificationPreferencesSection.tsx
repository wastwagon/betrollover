'use client';

import { useCallback, useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useT } from '@/context/LanguageContext';

type PrefGroup = {
  group: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
};

const GROUP_LABEL_KEYS: Record<string, string> = {
  marketplace: 'notifications.pref_group_marketplace',
  wallet: 'notifications.pref_group_wallet',
  social: 'notifications.pref_group_social',
  account: 'notifications.pref_group_account',
  system: 'notifications.pref_group_system',
};

export function NotificationPreferencesSection() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [groups, setGroups] = useState<PrefGroup[]>([]);

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${getApiUrl()}/notifications/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = r.ok ? await r.json() : null;
      if (data) {
        setEmailNotifications(data.emailNotifications !== false);
        setPushNotifications(data.pushNotifications === true);
        setGroups(Array.isArray(data.groups) ? data.groups : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateGroup = (group: string, patch: Partial<PrefGroup>) => {
    setGroups((prev) => prev.map((g) => (g.group === group ? { ...g, ...patch } : g)));
  };

  const save = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    setMsg('');
    try {
      const r = await fetch(`${getApiUrl()}/notifications/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emailNotifications,
          pushNotifications,
          groups,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        setEmailNotifications(data.emailNotifications !== false);
        setPushNotifications(data.pushNotifications === true);
        setGroups(Array.isArray(data.groups) ? data.groups : groups);
        setMsg(t('notifications.prefs_saved'));
      } else {
        setMsg(getApiErrorMessage(data, t('notifications.prefs_save_failed')));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ios-grouped-section p-5 min-w-0">
        <div className="h-24 rounded-xl bg-[var(--fill-secondary)] animate-pulse" />
      </div>
    );
  }

  return (
    <div id="notification-preferences" className="ios-grouped-section p-5 min-w-0 space-y-4 scroll-mt-24">
      <div>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          {t('notifications.prefs_title')}
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{t('notifications.prefs_desc')}</p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer py-1">
        <input
          type="checkbox"
          checked={emailNotifications}
          onChange={(e) => setEmailNotifications(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-[var(--primary)]"
        />
        <span>
          <span className="text-sm font-medium text-[var(--text)] block">{t('notifications.master_email')}</span>
          <span className="text-xs text-[var(--text-muted)]">{t('notifications.master_email_desc')}</span>
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer py-1">
        <input
          type="checkbox"
          checked={pushNotifications}
          onChange={(e) => setPushNotifications(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-[var(--primary)]"
        />
        <span>
          <span className="text-sm font-medium text-[var(--text)] block">{t('notifications.master_push')}</span>
          <span className="text-xs text-[var(--text-muted)]">{t('notifications.master_push_desc')}</span>
        </span>
      </label>

      <div className="border-t border-[var(--separator)] pt-4 space-y-4">
        {groups.map((g) => (
          <div key={g.group} className="rounded-xl border border-[var(--border)] p-4 bg-[var(--bg)]/50">
            <p className="text-sm font-semibold text-[var(--text)] mb-3">
              {t(GROUP_LABEL_KEYS[g.group] ?? g.group)}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={g.inAppEnabled}
                  onChange={(e) => updateGroup(g.group, { inAppEnabled: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--primary)]"
                />
                {t('notifications.channel_in_app')}
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={g.emailEnabled}
                  onChange={(e) => updateGroup(g.group, { emailEnabled: e.target.checked })}
                  disabled={!emailNotifications}
                  className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--primary)] disabled:opacity-40"
                />
                {t('notifications.channel_email')}
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={g.pushEnabled}
                  onChange={(e) => updateGroup(g.group, { pushEnabled: e.target.checked })}
                  disabled={!pushNotifications}
                  className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--primary)] disabled:opacity-40"
                />
                {t('notifications.channel_push')}
              </label>
            </div>
          </div>
        ))}
      </div>

      {msg ? <p className="text-sm text-[var(--primary)]">{msg}</p> : null}
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white disabled:opacity-50"
      >
        {saving ? t('notifications.prefs_saving') : t('notifications.prefs_save')}
      </button>
    </div>
  );
}
