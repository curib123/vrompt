import { cn } from '@/lib/cn';

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-2xl bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900',
        className,
      )}
    />
  );
}
