'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export function Modal({
  children,
  description,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  description: string;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    closeButtonRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 md:items-center"
      role="dialog"
    >
      <button
        aria-label="Close modal overlay"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <div
        aria-describedby="modal-description"
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-zinc-800 dark:bg-zinc-950',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3
              className="text-xl font-semibold text-black dark:text-white"
              id="modal-title"
            >
              {title}
            </h3>
            <p
              className="text-sm text-zinc-600 dark:text-zinc-400"
              id="modal-description"
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
    </div>
  );
}
