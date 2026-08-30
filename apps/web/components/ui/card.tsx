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
        'min-w-0 rounded-[1.5rem] border border-[#E6E6E6] bg-white/95 p-4 shadow-[0_18px_50px_rgba(13,13,13,0.06)] backdrop-blur sm:p-6 dark:border-[#1A1A1A] dark:bg-[#1A1A1A]/95',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
