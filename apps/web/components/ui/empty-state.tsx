import Link from 'next/link';
import type { Route } from 'next';

import { BrandMark } from '@/components/brand/brand-mark';
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
    <Card className="flex min-h-56 flex-col items-start justify-between gap-7 bg-linear-to-br from-white to-[#F7F7F7] dark:from-[#1A1A1A] dark:to-[#111111]">
      <div className="grid gap-4">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#0D0D0D] text-white dark:bg-white dark:text-[#0D0D0D]">
          <BrandMark className="size-6" />
        </span>
        <h3 className="text-2xl font-semibold tracking-[-0.04em] text-black dark:text-white">
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
