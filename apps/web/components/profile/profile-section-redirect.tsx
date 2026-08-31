'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/auth-provider';
import { Card } from '@/components/ui/card';

export function ProfileSectionRedirect({
  tab,
}: {
  tab: 'saved' | 'collections' | 'following' | 'settings';
}) {
  const router = useRouter();
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(`/u/${user.username}?tab=${tab}`);
    }
  }, [isLoading, router, tab, user]);

  return (
    <Card>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Opening your profile workspace...
      </p>
    </Card>
  );
}
