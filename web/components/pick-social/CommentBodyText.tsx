'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/site-config';
import { extractMentionsFromBody } from '@/lib/pick-comment-mention';
import { useT } from '@/context/LanguageContext';

const MENTION_SPLIT = /(@[a-zA-Z0-9_]{2,30}\b)/g;

type MentionProfile = { href: string | null; displayName: string };

export function CommentBodyText({ body }: { body: string }) {
  const t = useT();
  const mentions = useMemo(() => extractMentionsFromBody(body), [body]);
  const mentionKey = mentions.join(',');
  const [profiles, setProfiles] = useState<Record<string, MentionProfile>>({});

  useEffect(() => {
    if (mentions.length === 0) {
      setProfiles({});
      return;
    }
    const token = localStorage.getItem('token');
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const q = encodeURIComponent(mentionKey);
    fetch(`${getApiUrl()}/users/mentions/resolve?usernames=${q}`, { headers })
      .then((r) => (r.ok ? r.json() : { profiles: {} }))
      .then((data) => {
        const map = (data?.profiles ?? {}) as Record<string, MentionProfile>;
        setProfiles(map);
      })
      .catch(() => setProfiles({}));
  }, [mentionKey, mentions.length]);

  const parts = body.split(MENTION_SPLIT);
  return (
    <>
      {parts.map((part, i) => {
        if (!part.startsWith('@') || part.length <= 1) {
          return <span key={i}>{part}</span>;
        }
        const username = part.slice(1);
        const profile = profiles[username.toLowerCase()];
        if (profile?.href) {
          return (
            <Link
              key={i}
              href={profile.href}
              className="font-semibold text-[var(--primary)] hover:underline"
              onClick={(e) => e.stopPropagation()}
              title={profile.displayName}
            >
              {part}
            </Link>
          );
        }
        if (profile && !profile.href) {
          return (
            <span
              key={i}
              className="font-semibold text-[var(--text-muted)]"
              title={t('pick_social.mention_no_profile')}
            >
              {part}
            </span>
          );
        }
        return (
          <Link
            key={i}
            href={`/tipsters/${encodeURIComponent(username)}`}
            className="font-semibold text-[var(--primary)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      })}
    </>
  );
}
