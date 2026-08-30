import Link from 'next/link';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { getButtonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export function RoutePlaceholder({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="grid gap-8">
      <Card className="space-y-6">
        <Badge>{eyebrow}</Badge>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {actions ?? (
            <>
              <Link className={getButtonClasses('primary')} href="/explore">
                Explore the foundation
              </Link>
              <Link className={getButtonClasses('secondary')} href="/create">
                Open the editor shell
              </Link>
            </>
          )}
        </div>
      </Card>
      <EmptyState
        actionHref="/"
        actionLabel="Return home"
        description="This route is intentionally ready for real data and workflows later, without shipping repository features too early."
        title={`${title} is waiting for product logic.`}
      />
    </div>
  );
}
