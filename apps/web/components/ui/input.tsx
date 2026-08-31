import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-11 w-full rounded-2xl border border-[#E6E6E6] bg-white px-4 py-2 text-sm text-foreground outline-none transition placeholder:text-brand-mid focus:border-[#0D0D0D] dark:border-[#4D4D4D] dark:bg-[#1A1A1A] dark:focus:border-white',
        className,
      )}
      {...props}
    />
  );
}
