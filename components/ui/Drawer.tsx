'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Slide-in navigation panel — a bottom sheet on phones, a side panel where a
 * sheet would feel wrong.
 *
 * Deliberately not built on `<dialog>` like `Modal` is: these panels are
 * anchored to a screen edge and animate in, and `showModal()` fights the
 * transform-based entrance. Escape, the scrim, scroll lock and focus return
 * are wired up by hand instead, so the behaviour matches `Modal` even though
 * the mechanics differ.
 */
export function Drawer({
  open,
  onClose,
  title,
  side = 'bottom',
  labelledBy,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** Visible heading. Omit it and pass `labelledBy` to supply your own. */
  title?: string;
  side?: 'bottom' | 'right';
  labelledBy?: string;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Escape closes, wherever focus happens to be.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // The page behind must not scroll under the sheet.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Move focus in on open and hand it back to whatever opened the drawer.
  useEffect(() => {
    if (!open) {
      openerRef.current?.focus?.();
      openerRef.current = null;
      return;
    }
    openerRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const isBottom = side === 'bottom';

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="presentation">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full animate-fade-scrim bg-clay-900/50 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : title}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'absolute flex flex-col overflow-hidden bg-cream-50 shadow-pop outline-none',
          isBottom
            ? 'inset-x-0 bottom-0 max-h-[88dvh] animate-slide-up rounded-t-3xl border-t border-clay-200'
            : 'inset-y-0 right-0 w-[19rem] max-w-[86vw] animate-slide-in-right border-l border-clay-200',
          className,
        )}
      >
        {isBottom && (
          <div className="flex justify-center pt-2.5" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-clay-200" />
          </div>
        )}

        {title && (
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-3">
            <h2 className="font-serif text-base font-semibold text-clay-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="-mr-1.5 rounded-lg p-1.5 text-clay-500 transition-colors hover:bg-clay-100 hover:text-clay-800"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4',
            isBottom ? 'safe-bottom pb-5' : 'safe-bottom py-4',
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
