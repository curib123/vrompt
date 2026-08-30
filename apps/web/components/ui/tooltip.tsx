import type { ReactNode } from 'react';

export function Tooltip({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <span className="group relative inline-flex">
      <span>{children}</span>
      <span
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 shadow-sm group-focus-within:block group-hover:block dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}
