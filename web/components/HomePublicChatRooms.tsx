'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/site-config';

interface Room {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  todayMessages: number;
}

export function HomePublicChatRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiUrl()}/chat/rooms`)
      .then((r) => r.json())
      .then((data: Room[]) => setRooms(Array.isArray(data) ? data : []))
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || rooms.length === 0) return null;

  return (
    <section className="py-14 md:py-20 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wide mb-3">
            Community
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--text)] mb-3">
            Public Chat Rooms
          </h2>
          <p className="text-[var(--text-muted)] text-base max-w-xl mx-auto">
            Join live sport discussions with tipsters and fans. Football, basketball, tennis & more.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {rooms.slice(0, 10).map((room) => (
            <Link
              key={room.slug}
              href={`/community?room=${room.slug}`}
              className="flex flex-col items-center p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-indigo-500/50 hover:shadow-lg transition-all duration-200 group"
            >
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                {room.icon}
              </span>
              <span className="font-semibold text-sm text-[var(--text)] text-center truncate w-full">
                {room.name}
              </span>
              {room.todayMessages > 0 && (
                <span className="text-xs text-indigo-500 mt-0.5">
                  {room.todayMessages} today
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/community"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors text-sm"
          >
            <span>💬</span>
            <span>Open Community Chat</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
