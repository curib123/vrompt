import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      className={cn(
        'min-h-32 w-full rounded-3xl border border-[#E6E6E6] bg-white px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-brand-mid focus:border-[#0D0D0D] dark:border-[#4D4D4D] dark:bg-[#1A1A1A] dark:focus:border-white',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
