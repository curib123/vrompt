import Link from 'next/link';
import type { Metadata } from 'next';

import { BrandLockup, BrandMark } from '@/components/brand/brand-mark';
import { OrganicFunnelTracker } from '@/components/analytics/organic-funnel-tracker';
import { Badge } from '@/components/ui/badge';
import { getButtonClasses } from '@/components/ui/button';
import { createPageMetadata, siteConfig } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: siteConfig.tagline,
  description: siteConfig.description,
  path: '/',
});

export default function LandingPage() {
  return (
    <>
      <OrganicFunnelTracker />
      <div className="grid gap-16 sm:gap-24">
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#0D0D0D] px-5 py-6 text-white shadow-[0_24px_70px_rgba(13,13,13,0.16)] sm:px-10 sm:py-10 lg:px-16 lg:py-14">
          <div className="pointer-events-none absolute -right-28 -top-32 size-[28rem] rounded-full border-[3rem] border-white/[0.07]" />
          <div className="pointer-events-none absolute -bottom-40 left-[42%] size-[30rem] rounded-full border border-white/[0.12]" />
          <div className="relative grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.78fr)] lg:items-center lg:gap-16">
            <div className="grid gap-8">
              <div className="flex items-center justify-between gap-4 lg:hidden">
                <BrandLockup compact inverted />
                <BrandMark className="size-9 text-white/80" />
              </div>
              <Badge className="w-fit !border-white/30 !text-zinc-300">
                The prompt community
              </Badge>
              <div className="grid gap-5">
                <h1 className="max-w-3xl text-[clamp(2.5rem,4.8vw,4.5rem)] font-semibold leading-[0.94] tracking-[-0.065em]">
                  Vrompt
                  <br />
                  Find AI Prompts That Work.
                  <br />
                  Save Them. Make Them Better.
                </h1>
                <p className="max-w-xl text-base leading-8 text-zinc-300 sm:text-lg">
                  {siteConfig.description}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  className={getButtonClasses(
                    'secondary',
                    'w-full border-white bg-white text-on-light hover:border-white hover:bg-[#E6E6E6] sm:w-auto',
                  )}
                  href="/explore"
                >
                  Explore the library
                </Link>
                <Link
                  className={getButtonClasses(
                    'ghost',
                    'w-full border border-white/25 !text-white hover:bg-white/10 sm:w-auto',
                  )}
                  href="/login"
                >
                  Become a creator
                </Link>
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                Browse and copy free · Become a creator to save and share
              </p>
            </div>

            <div className="relative rounded-[1.75rem] border border-white/15 bg-white/[0.08] p-3 backdrop-blur sm:p-4">
              <div className="rounded-[1.25rem] bg-white p-5 text-on-light shadow-2xl sm:p-7">
                <div className="flex items-center justify-between gap-4 border-b border-[#E6E6E6] pb-5">
                  <div className="flex items-center gap-2">
                    <BrandMark className="size-6" />
                    <span className="text-sm font-semibold tracking-[-0.03em]">
                      Prompt library
                    </span>
                  </div>
                  <span className="size-2 rounded-full bg-[#0D0D0D]" />
                </div>
                <div className="grid gap-5 pt-7">
                  <Badge className="w-fit">Writing</Badge>
                  <h2 className="text-3xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-4xl">
                    Turn a rough idea into a clear plan.
                  </h2>
                  <p className="text-sm leading-7 text-on-light-muted">
                    A practical prompt with examples, notes, and the lessons
                    that make the next attempt stronger.
                  </p>
                  <div className="grid gap-3 border-t border-[#E6E6E6] pt-5 text-xs text-on-light-muted">
                    <div className="flex items-center justify-between gap-4">
                      <span>Built from experience</span>
                      <span className="font-mono">01 / 03</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#E6E6E6]">
                      <div className="h-full w-2/3 rounded-full bg-[#0D0D0D]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16"
          id="about"
        >
          <div className="grid content-start gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-600 dark:text-zinc-400">
              Why Vrompt
            </p>
            <h2 className="max-w-md text-4xl font-semibold leading-[0.98] tracking-[-0.07em] sm:text-6xl">
              Skip the blank page.
            </h2>
            <p className="max-w-md text-sm leading-7 text-zinc-600 dark:text-zinc-400 sm:text-base">
              {siteConfig.shortDescription}
            </p>
          </div>
          <div className="grid overflow-hidden rounded-[2rem] border border-[#E6E6E6] bg-white shadow-[0_18px_50px_rgba(13,13,13,0.05)] [&>article+article]:border-t [&>article+article]:border-[#E6E6E6] sm:grid-cols-3 sm:[&>article+article]:border-l sm:[&>article+article]:border-t-0 dark:border-[#1A1A1A] dark:bg-[#1A1A1A] dark:[&>article+article]:border-[#4D4D4D]">
            <ValueCard
              number="01"
              text="Search by goal, topic, or workflow and find a useful starting point faster."
              title="Find"
            />
            <ValueCard
              number="02"
              text="Learn from examples, results, and notes shared by people who use AI every day."
              title="Learn"
            />
            <ValueCard
              number="03"
              text="Save what works, improve it, and share the next version with the community."
              title="Evolve"
            />
          </div>
        </section>

        <section className="grid gap-5 rounded-[2rem] border border-[#E6E6E6] bg-white p-5 shadow-[0_18px_50px_rgba(13,13,13,0.06)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-8 dark:border-[#1A1A1A] dark:bg-[#1A1A1A]">
          <div className="grid gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-600 dark:text-zinc-400">
              Made for every level
            </p>
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.06em] sm:text-5xl">
              Start with experience, not a blank page.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              Browse freely. Copy a strong starting point. Become a creator when
              you are ready to save, discuss, and share your own experience.
            </p>
          </div>
          <Link
            className={getButtonClasses('primary', 'w-full sm:w-auto')}
            href="/explore"
          >
            Browse popular prompts
          </Link>
        </section>
      </div>
    </>
  );
}

function ValueCard({
  number,
  text,
  title,
}: {
  number: string;
  text: string;
  title: string;
}) {
  return (
    <article className="grid min-h-56 content-between gap-8 p-5 sm:min-h-64 sm:p-6">
      <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
        {number}
      </span>
      <div className="grid gap-3">
        <h3 className="text-2xl font-semibold tracking-[-0.05em]">{title}</h3>
        <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          {text}
        </p>
      </div>
    </article>
  );
}
