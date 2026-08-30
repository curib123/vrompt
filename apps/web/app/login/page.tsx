'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { BrandLockup, BrandMark } from '@/components/brand/brand-mark';
import { useAuth } from '@/components/providers/auth-provider';
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
        description:
          'Please ask the site owner to finish the Google sign-in setup.',
      });
    }
    beginGoogleLogin();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
      <Card className="grid content-start gap-7 rounded-[2rem] p-5 sm:p-8 lg:p-10">
        <div className="flex items-center justify-between gap-4">
          <BrandLockup compact />
          <span className="rounded-full border border-[#E6E6E6] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#4D4D4D] dark:border-[#4D4D4D] dark:text-[#E6E6E6]">
            Welcome
          </span>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[#4D4D4D] dark:text-[#BDBDBD]">
            Your prompts, ready when you are
          </p>
          <h1 className="max-w-lg text-3xl font-semibold leading-[1.05] tracking-[-0.06em] sm:text-4xl">
            Pick up your best ideas in one tap.
          </h1>
          <p className="max-w-md text-sm leading-6 text-[#4D4D4D] sm:text-base sm:leading-7 dark:text-[#BDBDBD]">
            Continue with Google to save useful prompts, follow creators, and
            share what works for you.
          </p>
        </div>

        {hasGoogleConfigError ? (
          <p
            className="rounded-2xl border border-[#BDBDBD] bg-[#E6E6E6] p-4 text-sm leading-6 text-[#4D4D4D]"
            role="status"
          >
            Google sign-in is not ready yet. Please ask the site owner to
            finish the sign-in setup.
          </p>
        ) : hasGoogleError ? (
          <p
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
            role="alert"
          >
            Google sign-in was not completed. Please try again.
          </p>
        ) : null}

        <Button
          className="min-h-14 w-full rounded-2xl bg-[#0D0D0D] px-4 text-base !text-white shadow-[0_12px_30px_rgba(13,13,13,0.18)] hover:bg-[#1A1A1A] dark:bg-white dark:!text-[#0D0D0D] dark:hover:bg-[#E6E6E6]"
          onClick={handleGoogleLogin}
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-white text-base font-bold text-[#0D0D0D] shadow-sm dark:bg-[#0D0D0D] dark:text-white"
          >
            G
          </span>
          Continue with Google
        </Button>

        <div className="grid gap-3 border-t border-[#E6E6E6] pt-5 text-sm dark:border-[#4D4D4D]">
          <p className="text-[#4D4D4D] dark:text-[#BDBDBD]">
            New here?{' '}
            <Link
              className="font-semibold text-[#0D0D0D] underline decoration-[#BDBDBD] underline-offset-4 dark:text-white"
              href="/register"
            >
              Create an account
            </Link>
          </p>
          <Link
            className="w-fit font-semibold text-[#0D0D0D] underline decoration-[#BDBDBD] underline-offset-4 dark:text-white"
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
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[#BDBDBD]">
              What you unlock
            </p>
            <BrandMark className="size-9 text-white" />
          </div>

          <div className="space-y-7">
            <div className="space-y-3">
              <h2 className="max-w-lg text-3xl font-semibold leading-[1.05] tracking-[-0.06em] sm:text-4xl">
                Keep the prompts that move your work forward.
              </h2>
              <p className="max-w-lg text-sm leading-6 text-[#BDBDBD] sm:text-base sm:leading-7">
                Build a personal collection from ideas shared by experienced
                creators and prompt engineers.
              </p>
            </div>

            <div className="grid gap-3">
              <Benefit number="01" text="Save prompts you want to use again" />
              <Benefit number="02" text="Follow creators and join discussions" />
              <Benefit number="03" text="Publish, improve, and share your own prompts" />
            </div>
          </div>

          <p className="border-t border-white/15 pt-5 text-xs leading-5 text-[#BDBDBD]">
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
      <span className="font-mono text-xs font-semibold text-[#BDBDBD]">
        {number}
      </span>
      <p className="text-sm font-medium leading-5 text-white sm:text-base">
        {text}
      </p>
    </div>
  );
}
