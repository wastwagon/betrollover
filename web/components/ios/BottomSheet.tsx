'use client';

import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  titleId?: string;
  children: ReactNode;
  className?: string;
  maxHeightClass?: string;
  doneLabel?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  titleId = 'ios-bottom-sheet-title',
  children,
  className = '',
  maxHeightClass = 'max-h-[min(92dvh,720px)]',
  doneLabel = 'Done',
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onBackdropPointer = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end"
      role="presentation"
      onMouseDown={onBackdropPointer}
    >
      <div
        className="absolute inset-0 bg-black/40"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`relative w-full ${maxHeightClass} flex flex-col rounded-t-2xl bg-[var(--card)] border-t border-[var(--separator)] shadow-2xl animate-slide-up ${className}`}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ios-sheet-grabber shrink-0" aria-hidden />
        {title ? (
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-1 shrink-0 border-b border-[var(--separator)]">
            <h2 id={titleId} className="text-base font-semibold text-[var(--text)] min-w-0 truncate">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="touch-target shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--fill-secondary)] transition-colors"
            >
              {doneLabel}
            </button>
          </div>
        ) : null}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
