'use client';

import Link from 'next/link';

import { BrandLockup } from '@/components/brand/brand-mark';
import { useAuth } from '@/components/providers/auth-provider';
import { RoutePlaceholder } from '@/components/route-placeholder';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function RegisterPage() {
  const { beginGoogleLogin } = useAuth();

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <RoutePlaceholder
        description="Create your Vrompt identity with Google. Your public profile can be refined later, after the account is ready."
        eyebrow="Join Vrompt"
        title="Start with your Google account"
      />
      <Card className="flex flex-col justify-between gap-10">
        <BrandLockup />
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-[-0.05em]">
            Make ideas reusable.
          </h2>
          <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            Google handles authentication. Vrompt only receives your verified
            identity and creates the minimum account needed to get started.
          </p>
        </div>
        <Button onClick={beginGoogleLogin}>
          <span aria-hidden="true" className="text-lg font-semibold">
            G
          </span>
          Continue with Google
        </Button>
        <p className="text-sm text-zinc-500">
          Already have an account?{' '}
          <Link
            className="font-semibold text-[#0D0D0D] underline dark:text-white"
            href="/login"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
