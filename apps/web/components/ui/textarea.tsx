import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-32 w-full rounded-3xl border border-zinc-300 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-zinc-500 focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-white',
        className,
      )}
      {...props}
    />
  );
}
