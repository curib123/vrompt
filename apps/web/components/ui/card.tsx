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
        'rounded-[1.5rem] border border-[#D4D4D4] bg-white/95 p-6 shadow-[0_18px_50px_rgba(13,13,13,0.06)] backdrop-blur dark:border-zinc-800 dark:bg-[#1A1A1A]/95',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
