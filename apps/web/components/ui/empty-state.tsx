import Link from 'next/link';
import type { Route } from 'next';

import { getButtonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref?: Route;
  actionLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <Card className="flex min-h-64 flex-col items-start justify-between gap-6 bg-linear-to-br from-white to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
          Empty state
        </p>
        <h3 className="text-2xl font-semibold text-black dark:text-white">
          {title}
        </h3>
        <p className="max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </div>
      {actionHref && actionLabel ? (
        <Link className={getButtonClasses('primary')} href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </Card>
  );
}
