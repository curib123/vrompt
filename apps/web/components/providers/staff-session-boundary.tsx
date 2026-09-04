'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { useAuth } from './auth-provider';

export function StaffSessionBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const isStaff =
    user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const outsideControlPanel = isStaff && !pathname.startsWith('/admin');

  useEffect(() => {
    if (!isLoading && outsideControlPanel) router.replace('/admin');
  }, [isLoading, outsideControlPanel, router]);

  if (outsideControlPanel) {
    return (
      <div className="mx-auto mt-12 max-w-7xl px-4 text-sm text-brand-mid sm:px-6 lg:px-8">
        Opening the control panel…
      </div>
    );
  }

  return children;
}
