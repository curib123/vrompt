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
        'inline-flex items-center rounded-lg border border-[#4D4D4D]/40 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#4D4D4D] dark:border-[#E6E6E6]/40 dark:text-zinc-300',
        className,
      )}
    >
      {children}
    </span>
  );
}
