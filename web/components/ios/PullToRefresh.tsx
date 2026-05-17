'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';

const PULL_THRESHOLD = 72;
const MAX_PULL = 96;

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  className = '',
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const canPull = useCallback(() => {
    if (disabled || refreshing) return false;
    return typeof window !== 'undefined' && window.scrollY <= 2;
  }, [disabled, refreshing]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!canPull()) return;
      startY.current = e.touches[0]?.clientY ?? 0;
      pulling.current = true;
    },
    [canPull],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || !canPull()) return;
      const y = e.touches[0]?.clientY ?? 0;
      const delta = Math.max(0, y - startY.current);
      if (delta > 8) setPull(Math.min(delta * 0.45, MAX_PULL));
    },
    [canPull],
  );

  const finishPull = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const shouldRefresh = pull >= PULL_THRESHOLD;
    setPull(0);
    if (!shouldRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, pull]);

  return (
    <div
      className={`relative ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={() => void finishPull()}
      onTouchCancel={() => {
        pulling.current = false;
        setPull(0);
      }}
    >
      <div
        className="pointer-events-none flex justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: pull > 0 || refreshing ? Math.max(pull, refreshing ? 40 : 0) : 0 }}
        aria-hidden
      >
        <div className="flex items-end pb-2">
          <span
            className={`text-xs font-medium text-[var(--text-muted)] ${refreshing ? 'animate-pulse' : ''}`}
          >
            {refreshing ? 'Refreshing…' : pull >= PULL_THRESHOLD ? 'Release to refresh' : pull > 12 ? 'Pull to refresh' : ''}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
