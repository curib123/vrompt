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
        'rounded-[2rem] border border-zinc-200 bg-white/90 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
