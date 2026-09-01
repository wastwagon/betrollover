'use client';

import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { hapticLight } from '@/lib/haptic';

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

const DISMISS_PX = 96;
const DISMISS_VELOCITY = 0.55;

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
  const dragY = useRef(0);
  const dragStartY = useRef(0);
  const dragStartT = useRef(0);
  const dragging = useRef(false);
  const [offsetY, setOffsetY] = useState(0);
  const [draggingUi, setDraggingUi] = useState(false);

  const dismiss = useCallback(() => {
    hapticLight();
    onClose();
  }, [onClose]);

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
    if (!open) {
      setOffsetY(0);
      setDraggingUi(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }, 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, dismiss]);

  const onBackdropPointer = useCallback(
    (e: React.PointerEvent | React.MouseEvent) => {
      if (e.target === e.currentTarget) dismiss();
    },
    [dismiss],
  );

  const onHandlePointerDown = (e: ReactPointerEvent) => {
    dragging.current = true;
    dragStartY.current = e.clientY;
    dragStartT.current = performance.now();
    dragY.current = 0;
    setDraggingUi(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onHandlePointerMove = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const dy = Math.max(0, e.clientY - dragStartY.current);
    dragY.current = dy;
    setOffsetY(dy);
  };

  const onHandlePointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setDraggingUi(false);
    const elapsed = Math.max(1, performance.now() - dragStartT.current);
    const velocity = dragY.current / elapsed;
    if (dragY.current > DISMISS_PX || velocity > DISMISS_VELOCITY) {
      setOffsetY(0);
      dismiss();
      return;
    }
    setOffsetY(0);
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end"
      data-br-bottom-sheet=""
      role="presentation"
      onPointerDown={onBackdropPointer}
    >
      {/* pointer-events-none: Safari/iPadOS backdrop-filter can paint this layer above the sheet
          and swallow taps (App Review: account rows did nothing on iPad). Clicks on the dimmed
          area still hit this flex parent and dismiss. */}
      <div
        className="absolute inset-0 z-0 bg-black/40 pointer-events-none"
        style={{
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: offsetY > 0 ? Math.max(0.2, 1 - offsetY / 280) : 1,
        }}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`relative z-10 w-full ${maxHeightClass} flex flex-col rounded-t-2xl bg-[var(--card)] border-t border-[var(--separator)] shadow-2xl pointer-events-auto ${draggingUi ? '' : 'animate-slide-up'} ${className}`}
        style={{
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          transform: offsetY ? `translateY(${offsetY}px)` : undefined,
          transition: draggingUi ? 'none' : 'transform 0.28s var(--ease-ios)',
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="shrink-0 touch-none cursor-grab active:cursor-grabbing pt-2 pb-1"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          aria-label="Drag to dismiss"
        >
          <div className="ios-sheet-grabber" aria-hidden />
        </div>
        {title ? (
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-1 shrink-0 border-b border-[var(--separator)]">
            <h2 id={titleId} className="text-base font-semibold text-[var(--text)] min-w-0 truncate">
              {title}
            </h2>
            <button
              type="button"
              onClick={dismiss}
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
