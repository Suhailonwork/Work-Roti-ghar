'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A focus-trapping modal built on <dialog>, so Escape and the backdrop work
 * without pulling in a dialog library.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clicks land on the dialog element itself only when they hit the backdrop.
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'w-[calc(100vw-2rem)] rounded-2xl border border-clay-200 bg-cream-50 p-0 shadow-lift backdrop:bg-clay-900/40 backdrop:backdrop-blur-sm',
        widths[size],
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-clay-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-clay-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-clay-600">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 -mt-1 rounded-lg p-1.5 text-clay-500 hover:bg-clay-100 hover:text-clay-800"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {children && <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>}

      {footer && (
        <div className="flex justify-end gap-2 border-t border-clay-200 bg-cream-100/60 px-5 py-3">{footer}</div>
      )}
    </dialog>,
    document.body,
  );
}
