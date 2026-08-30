import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-32 w-full rounded-3xl border border-[#E6E6E6] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none transition placeholder:text-[#4D4D4D] focus:border-[#0D0D0D] dark:border-[#4D4D4D] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-white',
        className,
      )}
      {...props}
    />
  );
}
