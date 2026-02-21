'use client';

import { createContext, useContext, useCallback, useState, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'betrollover_slip_cart';

export interface SlipSelection {
  fixtureId: number;
  matchDescription: string;
  prediction: string;
  odds: number;
  matchDate: string;
}

interface SlipCartContextValue {
  selections: SlipSelection[];
  setSelections: (s: SlipSelection[] | ((prev: SlipSelection[]) => SlipSelection[])) => void;
  addSelection: (s: SlipSelection) => void;
  removeSelection: (idx: number) => void;
  clearCart: () => void;
  slipCount: number;
}

const SlipCartContext = createContext<SlipCartContextValue | null>(null);

function loadFromStorage(): SlipSelection[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(selections: SlipSelection[]) {
  if (typeof window === 'undefined') return;
  try {
    if (selections.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
    }
  } catch {
    // ignore
  }
}

export function SlipCartProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelectionsState] = useState<SlipSelection[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSelectionsState(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveToStorage(selections);
  }, [selections, hydrated]);

  const setSelections = useCallback((updater: SlipSelection[] | ((prev: SlipSelection[]) => SlipSelection[])) => {
    setSelectionsState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const addSelection = useCallback((s: SlipSelection) => {
    setSelectionsState((prev) => {
      if (prev.some((x) => x.fixtureId === s.fixtureId && x.prediction === s.prediction)) return prev;
      return [...prev, s];
    });
  }, []);

  const removeSelection = useCallback((idx: number) => {
    setSelectionsState((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const clearCart = useCallback(() => {
    setSelectionsState([]);
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      selections,
      setSelections,
      addSelection,
      removeSelection,
      clearCart,
      slipCount: selections.length,
    }),
    [selections, setSelections, addSelection, removeSelection, clearCart],
  );

  return <SlipCartContext.Provider value={value}>{children}</SlipCartContext.Provider>;
}

export function useSlipCart() {
  const ctx = useContext(SlipCartContext);
  if (!ctx) throw new Error('useSlipCart must be used within SlipCartProvider');
  return ctx;
}

export function useSlipCount(): number {
  const ctx = useContext(SlipCartContext);
  return ctx?.slipCount ?? 0;
}
