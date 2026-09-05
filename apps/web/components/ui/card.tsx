import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Card({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-[1.25rem] border border-brand-soft bg-[var(--brand-surface)]/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur sm:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
