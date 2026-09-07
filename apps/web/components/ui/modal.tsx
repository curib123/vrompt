'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export function Modal({
  children,
  className,
  description,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  className?: string;
  description: string;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      aria-modal="true"
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 md:items-center"
      role="dialog"
    >
      <button
        aria-label="Close modal overlay"
        tabIndex={-1}
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <div
        className={cn(
          'relative z-10 max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-zinc-800 dark:bg-zinc-950',
          className,
        )}
        ref={dialogRef}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3
              className="text-xl font-semibold text-black dark:text-white"
              id={titleId}
            >
              {title}
            </h3>
            <p
              className="text-sm text-zinc-600 dark:text-zinc-400"
              id={descriptionId}
            >
              {description}
            </p>
          </div>
          <Button
            className="px-4"
            onClick={onClose}
            ref={closeButtonRef}
            variant="ghost"
          >
            Close
          </Button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
