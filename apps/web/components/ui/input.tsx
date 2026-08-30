import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-11 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm text-black outline-none transition placeholder:text-zinc-500 focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-white',
        className,
      )}
      {...props}
    />
  );
}
