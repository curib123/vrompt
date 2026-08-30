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
        'inline-flex items-center rounded-lg border border-[#BDBDBD] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#4D4D4D] dark:border-zinc-700 dark:text-zinc-300',
        className,
      )}
    >
      {children}
    </span>
  );
}
