'use client';

import { useEffect, useEffectEvent } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';

import { BrandLockup } from '@/components/brand/brand-mark';
import { useAuth } from '@/components/providers/auth-provider';
import { Card } from '@/components/ui/card';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { consumeOAuthReturnPath } from '@/lib/auth-return';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const completeAuth = useEffectEvent(async () => {
    try {
      // New OAuth accounts finish their required discovery preferences before entering Vrompt.
      const nextUser = await refreshSession();
      trackAnalyticsEvent('auth_completed', { source: 'oauth' });
      router.replace(
        (nextUser.onboardingCompleted
          ? consumeOAuthReturnPath() || '/search'
          : '/onboarding/audience') as Route,
      );
    } catch {
      router.replace('/login?error=oauth_auth_failed');
    }
  });

  useEffect(() => {
    void completeAuth();
  }, []);

  return (
    <Card className="mx-auto flex max-w-md flex-col items-center gap-6 py-16 text-center">
      <BrandLockup />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Finishing your secure OAuth sign-in...
      </p>
    </Card>
  );
}
