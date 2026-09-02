import Link from 'next/link';
import type { Metadata } from 'next';

import { OrganicFunnelTracker } from '@/components/analytics/organic-funnel-tracker';
import { FeatureGate } from '@/components/providers/public-settings-provider';
import { BrandMark } from '@/components/brand/brand-mark';
import { getButtonClasses } from '@/components/ui/button';
import { createPageMetadata, siteConfig } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: siteConfig.tagline,
  description: siteConfig.description,
  path: '/',
});

const communityStats = [
  { value: '1,000+', label: 'prompts to explore' },
  { value: '100+', label: 'active creators' },
  { value: '∞', label: 'ways to improve' },
];

const steps = [
  {
    number: '01',
    title: 'Find your starting point',
    text: 'Search by outcome, workflow, category, or tool—not vague prompt titles.',
    icon: 'search',
  },
  {
    number: '02',
    title: 'See what actually works',
    text: 'Review the prompt, examples, creator notes, and version history before you copy.',
    icon: 'spark',
  },
  {
    number: '03',
    title: 'Make it better',
    text: 'Save your favorites, publish a Variant, and keep attribution connected.',
    icon: 'branch',
  },
] as const;

export default function LandingPage() {
  return (
    <>
      <OrganicFunnelTracker />
      <div className="grid gap-20 overflow-hidden sm:gap-28 lg:gap-36">
        <Hero />

        <FeatureGate setting="features.showCommunityStats">
          <section aria-label="Vrompt community overview">
            <div className="grid overflow-hidden rounded-[1.75rem] border border-[#E6E6E6] bg-white/80 shadow-[0_18px_60px_rgba(13,13,13,0.05)] backdrop-blur sm:grid-cols-3 dark:border-[#292929] dark:bg-[#151515]/90">
              {communityStats.map((stat) => (
                <div
                  className="flex items-center justify-between gap-4 border-b border-[#E6E6E6] px-5 py-5 last:border-b-0 sm:block sm:border-b-0 sm:border-r sm:px-7 sm:py-7 sm:last:border-r-0 dark:border-[#292929]"
                  key={stat.label}
                >
                  <p className="text-2xl font-semibold tracking-[-0.05em] sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="text-right text-xs font-medium uppercase tracking-[0.16em] text-brand-mid sm:mt-2 sm:text-left">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </FeatureGate>

        <section className="grid gap-10" id="how-it-works">
          <SectionIntro
            eyebrow="A better prompt workflow"
            title="From blank page to better work."
            text="Vrompt turns scattered prompt experiments into a library you can understand, trust, and build on."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {steps.map((step) => (
              <article
                className="group relative grid min-h-72 content-between overflow-hidden rounded-[1.75rem] border border-[#E6E6E6] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#BDBDBD] hover:shadow-[0_24px_70px_rgba(13,13,13,0.08)] sm:p-8 dark:border-[#292929] dark:bg-[#151515] dark:hover:border-[#4D4D4D] dark:hover:shadow-none"
                key={step.number}
              >
                <div className="flex items-start justify-between gap-6">
                  <FeatureIcon name={step.icon} />
                  <span className="font-mono text-xs tracking-[0.2em] text-brand-mid">
                    {step.number}
                  </span>
                </div>
                <div className="grid gap-3">
                  <h3 className="max-w-xs text-2xl font-semibold leading-tight tracking-[-0.05em]">
                    {step.title}
                  </h3>
                  <p className="max-w-sm text-sm leading-7 text-brand-mid">
                    {step.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-10">
          <SectionIntro
            eyebrow="Built for iteration"
            title="Prompts should have a history."
            text="Keep the context around every useful prompt so the next person can improve it instead of starting over."
          />
          <div className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
            <article className="relative isolate min-h-[28rem] overflow-hidden rounded-[2rem] bg-[#0D0D0D] p-6 text-white shadow-[0_28px_80px_rgba(13,13,13,0.18)] sm:p-10 dark:border dark:border-[#292929]">
              <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_75%_25%,rgba(255,255,255,0.16),transparent_28%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:auto,36px_36px,36px_36px]" />
              <div className="relative flex h-full flex-col justify-between gap-16">
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                    Version history
                  </span>
                  <span className="font-mono text-xs text-zinc-400">v3.2</span>
                </div>
                <div>
                  <p className="max-w-2xl text-[clamp(2rem,5vw,4.25rem)] font-semibold leading-[0.96] tracking-[-0.065em]">
                    See how a good idea becomes a great prompt.
                  </p>
                  <div className="mt-8 flex items-center gap-3 text-sm text-zinc-300">
                    <span className="grid size-9 place-items-center rounded-full bg-white text-xs font-bold text-black">
                      V
                    </span>
                    Every improvement stays visible.
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <FeatureTile
                icon="bookmark"
                title="Your library, organized"
                text="Save prompts into focused collections and come back when the work calls for them."
              />
              <FeatureTile
                icon="branch"
                title="Attribution that travels"
                text="Variants stay connected to their source, giving every creator visible credit."
              />
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#D8D8D8] bg-[#F5F5F3] px-5 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-16 dark:border-[#292929] dark:bg-[#151515]">
          <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border-[2.5rem] border-black/[0.04] dark:border-white/[0.04]" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="grid gap-5">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-brand-mid">
                Ready when you are
              </p>
              <h2 className="max-w-4xl text-[clamp(2.25rem,6vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.07em]">
                Your next great prompt is already taking shape.
              </h2>
              <p className="max-w-xl text-sm leading-7 text-brand-mid sm:text-base">
                Browse freely, copy what helps, and join the community when you
                are ready to share what you learned.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                className={getButtonClasses(
                  'primary',
                  'group w-full whitespace-nowrap px-6 sm:w-auto',
                )}
                href="/explore"
              >
                Explore prompts
                <ArrowIcon className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                className={getButtonClasses(
                  'secondary',
                  'w-full whitespace-nowrap px-6 sm:w-auto',
                )}
                href="/login"
              >
                Share your work
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#E6E6E6] bg-[#F5F5F3] p-3 shadow-[0_28px_90px_rgba(13,13,13,0.08)] sm:p-4 dark:border-[#292929] dark:bg-[#151515] dark:shadow-none">
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_12%_12%,rgba(255,255,255,0.95),transparent_28%),radial-gradient(circle_at_88%_82%,rgba(13,13,13,0.08),transparent_30%)] dark:opacity-10" />
      <div className="relative overflow-hidden rounded-[1.45rem] border border-white/80 bg-white/75 px-5 py-8 backdrop-blur-xl sm:px-9 sm:py-12 lg:px-12 lg:py-14 dark:border-white/10 dark:bg-[#0D0D0D]/75">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.03fr)_minmax(22rem,0.97fr)] lg:items-center lg:gap-14">
          <div className="grid gap-7">
            <div className="flex w-fit items-center gap-2 rounded-full border border-[#D5D5D5] bg-white px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brand-mid shadow-sm dark:border-[#333] dark:bg-[#1A1A1A]">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              The open prompt library
            </div>
            <div className="grid gap-5">
              <h1 className="max-w-4xl text-[clamp(3rem,7vw,6.6rem)] font-semibold leading-[0.87] tracking-[-0.075em]">
                Don&apos;t just prompt.
                <span className="block text-zinc-500 dark:text-zinc-400">
                  Build on what works.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-8 text-brand-mid sm:text-lg">
                Discover prompts with proof, understand how they evolved, and
                turn proven ideas into your best work yet.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className={getButtonClasses(
                  'primary',
                  'group w-full px-6 sm:w-auto',
                )}
                href="/explore"
              >
                Explore the library
                <ArrowIcon className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                className={getButtonClasses(
                  'secondary',
                  'w-full px-6 sm:w-auto',
                )}
                href="#how-it-works"
              >
                See how it works
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-brand-mid">
              <span className="inline-flex items-center gap-2">
                <CheckIcon /> Free to browse
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckIcon /> Built by creators
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckIcon /> Versioned openly
              </span>
            </div>
          </div>

          <PromptShowcase />
        </div>
      </div>
    </section>
  );
}

function PromptShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:mx-0">
      <div className="absolute -left-5 top-10 hidden w-36 -rotate-6 rounded-2xl border border-[#E6E6E6] bg-white p-4 shadow-xl sm:block dark:border-[#333] dark:bg-[#1A1A1A]">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-brand-mid">
          Community signal
        </p>
        <p className="mt-3 text-2xl font-semibold tracking-[-0.05em]">4.9/5</p>
        <div className="mt-2 flex gap-1" aria-label="Rated 4.9 out of 5">
          {[0, 1, 2, 3, 4].map((star) => (
            <span className="text-xs" key={star}>
              ★
            </span>
          ))}
        </div>
      </div>
      <div className="relative ml-auto w-full rounded-[1.8rem] border border-[#D8D8D8] bg-[#0D0D0D] p-2.5 shadow-[0_32px_80px_rgba(13,13,13,0.22)] sm:w-[88%] dark:border-[#333]">
        <div className="overflow-hidden rounded-[1.35rem] bg-white text-on-light dark:bg-[#F5F5F3]">
          <div className="flex items-center justify-between border-b border-[#E6E6E6] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <BrandMark className="size-5" />
              <span className="text-xs font-semibold">Prompt repository</span>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="size-2 rounded-full bg-[#D0D0D0]" />
              <span className="size-2 rounded-full bg-[#D0D0D0]" />
              <span className="size-2 rounded-full bg-[#0D0D0D]" />
            </div>
          </div>
          <div className="grid gap-6 p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <span className="rounded-full bg-[#EEEEEC] px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em]">
                Strategy
              </span>
              <span className="font-mono text-[0.65rem] text-on-light-muted">
                v3 · Proven
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-3xl">
                Turn scattered research into a clear decision brief.
              </h2>
              <p className="mt-3 text-sm leading-6 text-on-light-muted">
                Distill sources, expose tradeoffs, and end with an actionable
                recommendation.
              </p>
            </div>
            <div className="rounded-2xl bg-[#F3F3F1] p-4 font-mono text-[0.68rem] leading-5 text-on-light-muted">
              <span className="text-black">Role:</span> Strategic research
              partner
              <br />
              <span className="text-black">Goal:</span> Compare evidence and
              recommend...
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[#E6E6E6] pt-5">
              <div
                className="flex -space-x-2"
                aria-label="Used by three creators"
              >
                {['A', 'M', 'K'].map((letter) => (
                  <span
                    className="grid size-8 place-items-center rounded-full border-2 border-white bg-[#DADAD7] text-[0.62rem] font-bold"
                    key={letter}
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <span className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white">
                Copy prompt
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 right-4 hidden items-center gap-3 rounded-2xl border border-[#E6E6E6] bg-white px-4 py-3 shadow-xl sm:flex dark:border-[#333] dark:bg-[#1A1A1A]">
        <span className="grid size-8 place-items-center rounded-full bg-[#0D0D0D] text-white">
          <FeatureIcon name="branch" small />
        </span>
        <span>
          <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-brand-mid">
            New variant
          </span>
          <span className="block text-xs font-semibold">Lineage preserved</span>
        </span>
      </div>
    </div>
  );
}

function SectionIntro({
  eyebrow,
  text,
  title,
}: {
  eyebrow: string;
  text: string;
  title: string;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[0.45fr_1fr] md:items-end md:gap-12">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-brand-mid">
        {eyebrow}
      </p>
      <div className="grid gap-4">
        <h2 className="max-w-4xl text-[clamp(2.4rem,6vw,5.25rem)] font-semibold leading-[0.92] tracking-[-0.07em]">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-brand-mid sm:text-base">
          {text}
        </p>
      </div>
    </div>
  );
}

function FeatureTile({
  icon,
  text,
  title,
}: {
  icon: 'bookmark' | 'branch';
  text: string;
  title: string;
}) {
  return (
    <article className="grid min-h-52 content-between gap-10 rounded-[1.75rem] border border-[#E6E6E6] bg-white p-6 sm:p-8 dark:border-[#292929] dark:bg-[#151515]">
      <FeatureIcon name={icon} />
      <div className="grid gap-2">
        <h3 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">
          {title}
        </h3>
        <p className="text-sm leading-7 text-brand-mid">{text}</p>
      </div>
    </article>
  );
}

function FeatureIcon({
  name,
  small = false,
}: {
  name: 'bookmark' | 'branch' | 'search' | 'spark';
  small?: boolean;
}) {
  const paths = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    spark: (
      <>
        <path d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5-6.5-2L10 9l2-6.5Z" />
        <path d="m19 3 .5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5L19 3Z" />
      </>
    ),
    branch: (
      <>
        <circle cx="6" cy="5" r="2" />
        <circle cx="18" cy="7" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M8 5h2a4 4 0 0 1 4 4v5a4 4 0 0 0 4 4M14 10a3 3 0 0 1 3-3" />
      </>
    ),
    bookmark: <path d="M6 4h12v17l-6-4-6 4V4Z" />,
  };
  const icon = (
    <svg
      aria-hidden="true"
      className={small ? 'size-4' : 'size-5'}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
  return small ? (
    icon
  ) : (
    <span className="grid size-11 place-items-center rounded-2xl border border-[#E0E0E0] bg-[#F5F5F3] text-foreground transition group-hover:scale-105 dark:border-[#333] dark:bg-[#202020]">
      {icon}
    </span>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <span className="grid size-4 place-items-center rounded-full bg-[#0D0D0D] text-white dark:bg-white dark:text-black">
      <svg
        aria-hidden="true"
        className="size-2.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
        viewBox="0 0 12 12"
      >
        <path d="m2.5 6 2.2 2.2L9.5 3.8" />
      </svg>
    </span>
  );
}
