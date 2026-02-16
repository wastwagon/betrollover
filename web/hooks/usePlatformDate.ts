'use client';

import { useEffect, useState } from 'react';

/**
 * Returns the current date in YYYY-MM-DD format.
 * Updates every minute and when the tab becomes visible,
 * so the platform always shows the correct date (e.g. across midnight).
 */
export function usePlatformDate() {
  const getToday = () => new Date().toISOString().slice(0, 10);

  const [today, setToday] = useState(getToday);

  useEffect(() => {
    const tick = () => setToday(getToday());

    // Update every minute
    const interval = setInterval(tick, 60_000);

    // Update when tab becomes visible (e.g. user returns after leaving overnight)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return today;
}

/**
 * Returns today and date options (today + next 6 days) in UTC, so they match the backend's 7-day fixture sync.
 */
export function usePlatformDateOptions() {
  const today = usePlatformDate();

  const dateOptions = (() => {
    const [y, m, day] = today.split('-').map(Number);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(y, m - 1, day + i, 12, 0, 0, 0));
      const value = d.toISOString().slice(0, 10);
      const label =
        i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
      return { value, label };
    });
  })();

  return { today, dateOptions };
}
