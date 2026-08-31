'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/auth-provider';

export function HomeRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/search');
    }
  }, [isLoading, router, user]);

  return !isLoading && user ? null : children;
}
