'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="space-y-5">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-600 dark:text-zinc-400">
        We can fix this
      </p>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">Something went wrong.</h1>
        <p className="max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          We hit a temporary problem, but you can return home and keep
          exploring.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </Card>
  );
}
