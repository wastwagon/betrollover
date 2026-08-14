'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/context/LanguageContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { BottomSheet } from '@/components/ios/BottomSheet';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'br_follow_push_nudge_v1';
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 14;

type FollowPushNudgeProps = {
  /** Bump when user successfully follows someone */
  triggerToken: number;
  tipsterName?: string | null;
};

function canShow(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    if (raw === 'never' || raw === 'done') return false;
    const parsed = JSON.parse(raw) as { until?: number };
    if (parsed?.until && Date.now() < parsed.until) return false;
  } catch {
    /* ignore */
  }
  return true;
}

function writeDone(kind: 'done' | 'never' | 'snooze') {
  try {
    if (kind === 'snooze') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ until: Date.now() + SNOOZE_MS }));
    } else {
      localStorage.setItem(STORAGE_KEY, kind);
    }
  } catch {
    /* ignore */
  }
}

/**
 * After following a tipster, offer Web Push so `new_pick_from_followed` alerts fire.
 * Backend already sends those; this closes the opt-in UX gap.
 */
export function FollowPushNudge({ triggerToken, tipsterName }: FollowPushNudgeProps) {
  const t = useT();
  const { supported, permission, registered, loading, requestAndRegister, error } =
    usePushNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (triggerToken <= 0) return;
    if (!supported) return;
    if (registered || permission === 'granted') return;
    if (!canShow()) return;
    const id = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(id);
  }, [triggerToken, supported, registered, permission]);

  if (!supported) return null;

  const closeSnooze = () => {
    writeDone('snooze');
    setOpen(false);
  };

  const enable = async () => {
    await requestAndRegister();
    writeDone('done');
    setOpen(false);
  };

  return (
    <BottomSheet
      open={open}
      onClose={closeSnooze}
      title={t('follow_push.title')}
      doneLabel={t('common.close')}
      maxHeightClass="max-h-[min(70dvh,400px)]"
    >
      <div className="px-4 pb-5 pt-1 space-y-4">
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          {tipsterName
            ? t('follow_push.body_named', { name: tipsterName })
            : t('follow_push.body')}
        </p>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => void enable()}
            disabled={loading}
            fullWidth
          >
            {loading ? t('common.loading') : t('follow_push.enable')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={closeSnooze}
            fullWidth
          >
            {t('follow_push.later')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              writeDone('never');
              setOpen(false);
            }}
            fullWidth
            className="text-xs"
          >
            {t('follow_push.never')}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
