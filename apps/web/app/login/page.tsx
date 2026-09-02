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
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  consumeOAuthReturnPath,
  rememberOAuthReturnPath,
  sanitizeReturnPath,
} from '@/lib/auth-return';

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
  const requestedReturnPath = sanitizeReturnPath(searchParams.get('next'));

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(
        (user.onboardingCompleted
          ? requestedReturnPath || consumeOAuthReturnPath() || '/search'
          : '/onboarding/audience') as Route,
      );
    }
  }, [isLoading, requestedReturnPath, router, user]);

  function handleGoogleLogin() {
    rememberOAuthReturnPath(requestedReturnPath);
    trackAnalyticsEvent('signup_started', { source: 'google' });
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
    rememberOAuthReturnPath(requestedReturnPath);
    trackAnalyticsEvent('signup_started', { source: 'github' });
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
            Become a creator
          </span>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-mid">
            Create your Vrompt identity
          </p>
          <h1 className="max-w-lg text-3xl font-semibold leading-[1.05] tracking-[-0.06em] sm:text-4xl">
            Make ideas reusable.
          </h1>
          <p className="max-w-md text-sm leading-6 text-brand-mid sm:text-base sm:leading-7">
            Create your Vrompt identity with Google or GitHub. Your public
            profile can be refined later, after the account is ready.
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
          <GoogleIcon />
          Continue with Google
        </Button>
        <Button
          className="min-h-14 w-full rounded-2xl"
          onClick={handleGitHubLogin}
          variant="secondary"
        >
          <GitHubIcon />
          Continue with GitHub
        </Button>

        <div className="grid gap-3 border-t border-[#E6E6E6] pt-5 text-sm dark:border-[#4D4D4D]">
          <p className="text-brand-mid">
            Already have an account? Use the same Google or GitHub button to
            sign in.
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

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path
        d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.26Z"
        fill="#4285F4"
      />
      <path
        d="M12 21.6c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.6Z"
        fill="#34A853"
      />
      <path
        d="M6.53 13.69a5.86 5.86 0 0 1 0-3.38V7.78H3.28a9.61 9.61 0 0 0 0 8.44l3.25-2.53Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.28c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.35 14.63 2.4 12 2.4a9.74 9.74 0 0 0-8.72 5.38l3.25 2.53C7.3 8 9.46 6.28 12 6.28Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.26c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.48.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.6-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}
