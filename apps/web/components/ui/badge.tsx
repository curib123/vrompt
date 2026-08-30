import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-zinc-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-700 dark:border-zinc-700 dark:text-zinc-300',
        className,
      )}
    >
      {children}
    </span>
  );
}
