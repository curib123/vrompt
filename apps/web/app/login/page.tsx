'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { BrandLockup } from '@/components/brand/brand-mark';
import { useAuth } from '@/components/providers/auth-provider';
import { RoutePlaceholder } from '@/components/route-placeholder';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { beginGoogleLogin } = useAuth();
  const { pushToast } = useToast();
  const hasGoogleError = searchParams.get('error') === 'google_auth_failed';
  const hasGoogleConfigError =
    searchParams.get('error') === 'google_not_configured';

  function handleGoogleLogin() {
    if (hasGoogleError) {
      pushToast({
        title: 'Google sign-in was not completed',
        description: 'Try again or choose a different Google account.',
      });
    }
    if (hasGoogleConfigError) {
      pushToast({
        title: 'Google sign-in needs setup',
        description: 'Add the Google OAuth values to your .env file first.',
      });
    }
    beginGoogleLogin();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <RoutePlaceholder
        description="Use your Google account to join the prompt community. Vrompt does not store a separate password for your account."
        eyebrow="Google auth"
        title="Sign in to Vrompt"
      />
      <Card className="flex flex-col justify-between gap-10">
        <BrandLockup />
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-[-0.05em]">
            One account. More ideas.
          </h2>
          <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            Continue securely with Google. You can add your profile details
            later, once you are inside Vrompt.
          </p>
        </div>
        {hasGoogleConfigError ? (
          <p
            className="rounded-xl border border-[#BDBDBD] bg-[#E6E6E6] p-3 text-sm text-[#4D4D4D]"
            role="status"
          >
            Google sign-in is not configured yet. Add `GOOGLE_CLIENT_ID` and
            `GOOGLE_CLIENT_SECRET` to `.env`, or come back later.
          </p>
        ) : hasGoogleError ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            Google sign-in was not completed. Please try again.
          </p>
        ) : null}
        <Button onClick={handleGoogleLogin}>
          <span aria-hidden="true" className="text-lg font-semibold">
            G
          </span>
          Continue with Google
        </Button>
        <p className="text-sm text-zinc-500">
          New here?{' '}
          <Link
            className="font-semibold text-[#0D0D0D] underline dark:text-white"
            href="/register"
          >
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}
