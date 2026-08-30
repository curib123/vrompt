import { cn } from '@/lib/cn';

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      aria-label={`${name} avatar`}
      className={cn(
        'flex size-10 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold uppercase tracking-[0.2em] text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-white',
        className,
      )}
      role="img"
    >
      {initials}
    </div>
  );
}
