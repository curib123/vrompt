import Link from 'next/link';

import { getButtonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotFound() {
  return (
    <Card className="space-y-5">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
        404
      </p>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">We couldn&apos;t find that page.</h1>
        <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          The page may have moved, or the link may no longer be available.
        </p>
      </div>
      <Link className={getButtonClasses('primary')} href="/">
        Back to home
      </Link>
    </Card>
  );
}
