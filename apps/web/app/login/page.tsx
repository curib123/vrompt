'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { BrandLockup, BrandMark } from '@/components/brand/brand-mark';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { beginGitHubLogin, beginGoogleLogin, isLoading, user } = useAuth();
  const { pushToast } = useToast();
  const hasGoogleError = searchParams.get('error') === 'google_auth_failed';
  const hasGoogleConfigError =
    searchParams.get('error') === 'google_not_configured';
  const hasGitHubError = searchParams.get('error') === 'github_auth_failed';
  const hasGitHubConfigError =
    searchParams.get('error') === 'github_not_configured';
  const hasOAuthError = searchParams.get('error') === 'oauth_auth_failed';

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(
        (user.onboardingCompleted
          ? '/search'
          : '/onboarding/audience') as Route,
      );
    }
  }, [isLoading, router, user]);

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
        description:
          'Please ask the site owner to finish the Google sign-in setup.',
      });
    }
    beginGoogleLogin();
  }

  function handleGitHubLogin() {
    if (hasGitHubError) {
      pushToast({
        title: 'GitHub sign-in was not completed',
        description: 'Try again or choose a different GitHub account.',
      });
    }
    if (hasGitHubConfigError) {
      pushToast({
        title: 'GitHub sign-in needs setup',
        description:
          'Please ask the site owner to finish the GitHub sign-in setup.',
      });
    }
    beginGitHubLogin();
  }

  if (isLoading || user) {
    return (
      <div
        className="grid min-h-72 place-items-center rounded-[2rem] border border-[#E6E6E6] bg-white/95 p-8 text-sm text-brand-mid dark:border-[#1A1A1A] dark:bg-[#1A1A1A]/95"
        role="status"
      >
        {user ? 'Opening your workspace...' : 'Checking your session...'}
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
      <Card className="grid content-start gap-7 rounded-[2rem] p-5 sm:p-8 lg:p-10">
        <div className="flex items-center justify-between gap-4">
          <BrandLockup compact />
          <span className="rounded-full border border-[#E6E6E6] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brand-mid dark:border-[#4D4D4D]">
            Welcome
          </span>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-mid">
            Your prompts, ready when you are
          </p>
          <h1 className="max-w-lg text-3xl font-semibold leading-[1.05] tracking-[-0.06em] sm:text-4xl">
            Pick up your best ideas in one tap.
          </h1>
          <p className="max-w-md text-sm leading-6 text-brand-mid sm:text-base sm:leading-7">
            Continue with Google or GitHub to save useful prompts, follow
            creators, and share what works for you.
          </p>
        </div>

        {hasGoogleConfigError ? (
          <p
            className="rounded-2xl border border-[#BDBDBD] bg-[#E6E6E6] p-4 text-sm leading-6 text-on-light-muted"
            role="status"
          >
            Google sign-in is not ready yet. Please ask the site owner to finish
            the sign-in setup.
          </p>
        ) : hasGitHubConfigError ? (
          <p
            className="rounded-2xl border border-[#BDBDBD] bg-[#E6E6E6] p-4 text-sm leading-6 text-on-light-muted"
            role="status"
          >
            GitHub sign-in is not ready yet. Please ask the site owner to finish
            the sign-in setup.
          </p>
        ) : hasGoogleError || hasGitHubError || hasOAuthError ? (
          <p
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300"
            role="alert"
          >
            {hasOAuthError
              ? 'OAuth sign-in was not completed. Please try again.'
              : hasGitHubError
                ? 'GitHub sign-in was not completed. Please try again.'
                : 'Google sign-in was not completed. Please try again.'}
          </p>
        ) : null}

        <Button
          className="min-h-14 w-full rounded-2xl bg-[#0D0D0D] px-4 text-base !text-background shadow-[0_12px_30px_rgba(13,13,13,0.18)] hover:bg-[#1A1A1A] dark:bg-white dark:hover:bg-[#E6E6E6]"
          onClick={handleGoogleLogin}
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-white text-base font-bold text-on-light shadow-sm dark:bg-[#0D0D0D] dark:text-on-dark"
          >
            G
          </span>
          Continue with Google
        </Button>
        <Button
          className="min-h-14 w-full rounded-2xl"
          onClick={handleGitHubLogin}
          variant="secondary"
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-foreground text-base font-bold text-background dark:bg-background dark:text-foreground"
          >
            GH
          </span>
          Continue with GitHub
        </Button>

        <div className="grid gap-3 border-t border-[#E6E6E6] pt-5 text-sm dark:border-[#4D4D4D]">
          <p className="text-brand-mid">
            New here?{' '}
            <Link
              className="font-semibold text-foreground underline decoration-[#BDBDBD] underline-offset-4"
              href="/register"
            >
              Create an account
            </Link>
          </p>
          <Link
            className="w-fit font-semibold text-foreground underline decoration-[#BDBDBD] underline-offset-4"
            href="/explore"
          >
            Browse prompts without signing in
          </Link>
        </div>
      </Card>

      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#0D0D0D] p-5 text-white shadow-[0_24px_70px_rgba(13,13,13,0.16)] sm:p-8 lg:min-h-[36rem] lg:p-10">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-20 size-64 rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -right-8 top-12 size-40 rounded-full border border-white/10"
        />

        <div className="relative flex h-full flex-col justify-between gap-10">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-on-dark-muted">
              What you unlock
            </p>
            <BrandMark className="size-9 text-white" />
          </div>

          <div className="space-y-7">
            <div className="space-y-3">
              <h2 className="max-w-lg text-3xl font-semibold leading-[1.05] tracking-[-0.06em] sm:text-4xl">
                Keep the prompts that move your work forward.
              </h2>
              <p className="max-w-lg text-sm leading-6 text-on-dark-muted sm:text-base sm:leading-7">
                Build a personal collection from ideas shared by experienced
                creators and prompt engineers.
              </p>
            </div>

            <div className="grid gap-3">
              <Benefit number="01" text="Save prompts you want to use again" />
              <Benefit
                number="02"
                text="Follow creators and join discussions"
              />
              <Benefit
                number="03"
                text="Publish, improve, and share your own prompts"
              />
            </div>
          </div>

          <p className="border-t border-white/15 pt-5 text-xs leading-5 text-on-dark-muted">
            Browsing and copying prompts stays open to everyone.
          </p>
        </div>
      </section>
    </div>
  );
}

function Benefit({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4">
      <span className="font-mono text-xs font-semibold text-on-dark-muted">
        {number}
      </span>
      <p className="text-sm font-medium leading-5 text-white sm:text-base">
        {text}
      </p>
    </div>
  );
}
