'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/auth-provider';
import { Card } from '@/components/ui/card';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    } else if (
      !isLoading &&
      user &&
      !user.onboardingCompleted &&
      pathname !== '/onboarding/audience'
    ) {
      router.replace('/onboarding/audience' as Route);
    }
  }, [isLoading, pathname, router, user]);

  if (isLoading || !user) {
    return (
      <Card>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Checking your session...
        </p>
        {!isLoading ? (
          <Link
            className="mt-4 inline-flex text-sm font-semibold underline"
            href="/login"
          >
            Continue to login
          </Link>
        ) : null}
      </Card>
    );
  }

  return children;
}
