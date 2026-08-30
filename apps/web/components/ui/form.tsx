import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function FormField({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description?: string;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-black dark:text-white">{label}</span>
      {children}
      {description ? (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </span>
      ) : null}
    </label>
  );
}

export function FieldGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('grid gap-4', className)}>{children}</div>;
}
