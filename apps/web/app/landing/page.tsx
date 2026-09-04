import Link from 'next/link';
import type { Metadata } from 'next';

import { OrganicFunnelTracker } from '@/components/analytics/organic-funnel-tracker';
import { AuthModalTrigger } from '@/components/auth/auth-modal';
import { getButtonClasses } from '@/components/ui/button';
import { createPageMetadata, siteConfig } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: siteConfig.tagline,
  description:
    'Create, save, organize, improve, and reuse your best prompts across ChatGPT, Claude, Gemini, and other AI tools.',
  path: '/',
});

const problems = [
  [
    'Find them again',
    'Good prompts disappear into old chats, screenshots, notes, and bookmarks.',
  ],
  [
    'Know what works',
    'Without examples or history, it is hard to tell which version to trust.',
  ],
  [
    'Keep them organized',
    'Useful prompts deserve a home you can return to when the work calls for them.',
  ],
  [
    'Improve without losing context',
    'A better draft should not erase the original or its creator.',
  ],
  [
    'Share them properly',
    'A useful prompt should arrive with its history and credit intact.',
  ],
  [
    'See where they came from',
    'See which prompts inspired each other and learn from related work.',
  ],
] as const;

const realWorldProblems = [
  '“I had a useful prompt before, but I cannot find it.”',
  '“I can get an AI result, but I cannot reliably repeat it.”',
  '“My team repeats the same AI work without a shared, trusted starting point.”',
] as const;

const workflow = [
  ['Find', 'Discover useful prompts by outcome, category, audience, or tool.'],
  ['Save', 'Keep the prompts you want to use again in focused Projects.'],
  ['Use', 'Copy a prompt and apply it quickly to the work in front of you.'],
  ['Improve', 'Publish better updates while your earlier drafts stay visible.'],
  [
    'Adapt this prompt',
    'Make your own prompt from another one while keeping credit intact.',
  ],
  ['Share', 'Send a permanent Vrompt link that opens the exact public prompt.'],
] as const;

const features = [
  ['Prompts', 'Keep a prompt, its context, and its public home together.'],
  [
    'History',
    'See how a prompt changed instead of guessing which draft is current.',
  ],
  [
    'Adapt this prompt',
    'Start your own direction without changing the original prompt.',
  ],
  [
    'Based on / Inspired by',
    'Follow the relationship between an original and the ideas it inspired.',
  ],
  [
    'Example Results',
    'Review real examples to understand how a prompt is meant to be used.',
  ],
  [
    'Projects & folders',
    'Organize useful prompts around projects, workflows, and recurring tasks.',
  ],
  [
    'Works with',
    'Record the models and tools a prompt is intended to work with.',
  ],
  [
    'Best for',
    'Find prompts relevant to how you work, whether you build, write, research, or design.',
  ],
  [
    'Public Sharing',
    'Give every public prompt a durable link people can open without an account.',
  ],
] as const;

export default function LandingPage() {
  return (
    <>
      <OrganicFunnelTracker />
      <div className="grid gap-24 overflow-hidden sm:gap-32 lg:gap-40">
        <Hero />

        <section
          aria-labelledby="real-world-problem-title"
          className="grid gap-8 rounded-[2rem] border border-[#E6E6E6] bg-[#F5F5F3] p-6 sm:p-10 dark:border-[#292929] dark:bg-[#151515]"
        >
          <div className="grid gap-3">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-brand-mid">
              Why Vrompt exists
            </p>
            <h2
              className="max-w-3xl text-3xl font-semibold tracking-[-0.06em] sm:text-5xl"
              id="real-world-problem-title"
            >
              AI is useful only when good work is easy to find and repeat.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-brand-mid sm:text-base">
              Vrompt gives useful prompts a dependable home, so individuals and
              teams can reuse what works instead of starting from scratch.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {realWorldProblems.map((problem, index) => (
              <blockquote
                className="rounded-[1.5rem] border border-[#E6E6E6] bg-white p-5 text-lg font-medium leading-7 tracking-[-0.02em] dark:border-[#292929] dark:bg-[#0D0D0D]"
                key={problem}
              >
                <span className="mb-5 block font-mono text-xs font-semibold tracking-[0.2em] text-brand-mid">
                  0{index + 1}
                </span>
                {problem}
              </blockquote>
            ))}
          </div>
        </section>

        <nav
          aria-label="Explore Vrompt"
          className="-mt-12 flex flex-wrap gap-x-6 gap-y-3 border-b border-[#E6E6E6] pb-6 text-sm font-medium text-brand-mid sm:-mt-16 dark:border-[#292929]"
        >
          <Link className="transition hover:text-foreground" href="/explore">
            Explore
          </Link>
        </nav>

        <section
          aria-labelledby="problem-title"
          className="grid gap-10"
          id="problem"
        >
          <SectionIntro
            eyebrow="The prompt problem"
            title="Prompts are everywhere. Your prompt library should not be."
            text="Good AI prompts are scattered across old chats, notes, screenshots, documents, Reddit, Discord, and bookmarks. Vrompt brings them into one searchable home."
            id="problem-title"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map(([title, text], index) => (
              <article
                className="grid gap-6 rounded-[1.5rem] border border-[#E6E6E6] bg-white/80 p-6 dark:border-[#292929] dark:bg-[#151515]"
                key={title}
              >
                <span className="font-mono text-xs font-semibold tracking-[0.2em] text-brand-mid">
                  0{index + 1}
                </span>
                <div className="grid gap-2">
                  <h3 className="text-xl font-semibold tracking-[-0.04em]">
                    {title}
                  </h3>
                  <p className="text-sm leading-6 text-brand-mid">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="workflow-title"
          className="grid gap-10"
          id="how-it-works"
        >
          <SectionIntro
            eyebrow="How Vrompt works"
            title="One place to create, save, use, and improve prompts."
            text="Discover a useful prompt, save it for later, use it, improve it, or adapt it into your own version."
            id="workflow-title"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workflow.map(([title, text], index) => (
              <article
                className="group grid min-h-52 content-between gap-10 rounded-[1.5rem] border border-[#E6E6E6] bg-white p-6 transition hover:-translate-y-1 hover:border-[#BDBDBD] hover:shadow-[0_20px_60px_rgba(13,13,13,0.07)] sm:p-7 dark:border-[#292929] dark:bg-[#151515] dark:hover:border-[#4D4D4D] dark:hover:shadow-none"
                key={title}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="grid size-10 place-items-center rounded-xl bg-[#F1F1EF] text-sm font-semibold dark:bg-[#242424]">
                    {index + 1}
                  </span>
                  {index < workflow.length - 1 ? (
                    <span className="hidden font-mono text-xs text-brand-mid sm:block">
                      →
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <h3 className="text-2xl font-semibold tracking-[-0.05em]">
                    {title}
                  </h3>
                  <p className="text-sm leading-6 text-brand-mid">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="features-title"
          className="grid gap-10"
          id="features"
        >
          <SectionIntro
            eyebrow="Built for everyday work"
            title="Every useful prompt has a home, context, and clear history."
            text="Vrompt keeps your instructions and useful context together, so you can understand them, reuse them, improve them, and give credit where it belongs."
            id="features-title"
          />
          <div className="grid gap-x-8 gap-y-0 border-y border-[#E6E6E6] dark:border-[#292929] sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, text], index) => (
              <article
                className="grid gap-3 border-b border-[#E6E6E6] py-6 last:border-b-0 sm:nth-[2n]:border-b-0 lg:nth-[3n]:border-b-0 dark:border-[#292929]"
                key={title}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-brand-mid">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-semibold tracking-[-0.03em]">{title}</h3>
                </div>
                <p className="pl-8 text-sm leading-6 text-brand-mid">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <VersionVariant />

        <SharingSection />

        <section
          aria-labelledby="final-cta-title"
          className="relative isolate overflow-hidden rounded-[2rem] border border-[#D8D8D8] bg-[#F5F5F3] px-5 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20 dark:border-[#292929] dark:bg-[#151515]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border-[2.5rem] border-black/[0.04] dark:border-white/[0.04]"
          />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-4">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-brand-mid">
                Ready to begin?
              </p>
              <h2
                className="max-w-3xl text-[clamp(2.5rem,6vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.07em]"
                id="final-cta-title"
              >
                Find your next useful prompt.
              </h2>
              <p className="max-w-xl text-sm leading-7 text-brand-mid sm:text-base">
                Search your prompts, save what matters, and make it better.
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
                Explore Vrompt{' '}
                <span
                  aria-hidden="true"
                  className="transition group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
              <AuthModalTrigger
                className={getButtonClasses(
                  'secondary',
                  'w-full whitespace-nowrap px-6 sm:w-auto',
                )}
                description="Create your Vrompt identity to publish prompts and build your creator profile."
                returnTo="/create"
                title="Become a creator"
              >
                Share Your First Prompt
              </AuthModalTrigger>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden rounded-[2rem] border border-[#E6E6E6] bg-[#F5F5F3] p-3 shadow-[0_28px_90px_rgba(13,13,13,0.08)] sm:p-4 dark:border-[#292929] dark:bg-[#151515] dark:shadow-none"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_12%_12%,rgba(255,255,255,0.95),transparent_28%),radial-gradient(circle_at_88%_82%,rgba(13,13,13,0.08),transparent_30%)] dark:opacity-10"
      />
      <div className="relative overflow-hidden rounded-[1.45rem] border border-white/80 bg-white/80 px-5 py-10 backdrop-blur-xl sm:px-9 sm:py-14 lg:px-14 lg:py-20 dark:border-white/10 dark:bg-[#0D0D0D]/80">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.72fr)] lg:items-center lg:gap-16">
          <div className="grid gap-7">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-brand-mid">
              Vrompt · Your workspace for reusable AI prompts and workflows
            </p>
            <div className="grid gap-5">
              <h1
                className="max-w-4xl text-[clamp(3.25rem,8vw,7.5rem)] font-semibold leading-[0.86] tracking-[-0.08em]"
                id="hero-title"
              >
                Turn repeated AI tasks into reusable workflows.
                <span className="block text-zinc-500 dark:text-zinc-400">
                  Create them. Use them. Make them better.
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-brand-mid sm:text-lg">
                Create, save, organize, improve, and reuse your best prompts
                across ChatGPT, Claude, Gemini, and other AI tools. Your best AI
                workflows should not disappear inside old chats.
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
                Explore Prompts{' '}
                <span
                  aria-hidden="true"
                  className="transition group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
              <Link
                className={getButtonClasses(
                  'secondary',
                  'w-full px-6 sm:w-auto',
                )}
                href="/generate"
              >
                Generate a Prompt
              </Link>
            </div>
            <p className="text-xs font-medium text-brand-mid">
              Browse, copy, and try AI prompt generation for free. Sign in with
              Google or GitHub when you are ready to save, comment, or publish.
            </p>
          </div>
          <HeroCard />
        </div>
      </div>
    </section>
  );
}

function HeroCard() {
  return (
    <div
      aria-label="Example saved Vrompt prompt"
      className="relative mx-auto w-full max-w-md rotate-1 rounded-[1.75rem] border border-[#D8D8D8] bg-[#0D0D0D] p-2.5 shadow-[0_32px_80px_rgba(13,13,13,0.2)] lg:rotate-2"
    >
      <div className="overflow-hidden rounded-[1.35rem] bg-white p-5 text-on-light sm:p-7">
        <div className="flex items-center justify-between border-b border-[#E6E6E6] pb-4 text-xs font-semibold">
          <span>Saved prompt</span>
          <span className="font-mono text-on-light-muted">v3</span>
        </div>
        <div className="grid gap-6 py-6">
          <div className="grid gap-2">
            <span className="w-fit rounded-full bg-[#EEEEEC] px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em]">
              Research
            </span>
            <h2 className="text-2xl font-semibold leading-tight tracking-[-0.055em]">
              Turn scattered research into a clear decision brief.
            </h2>
          </div>
          <p className="text-sm leading-6 text-on-light-muted">
            Distill sources, expose tradeoffs, and end with an actionable
            recommendation.
          </p>
          <div className="rounded-2xl bg-[#F3F3F1] p-4 font-mono text-[0.68rem] leading-5 text-on-light-muted">
            <span className="text-black">Task:</span> Compare evidence and
            recommend...
            <br />
            <span className="text-black">History:</span> v1 → v2 → v3
          </div>
          <div className="flex items-center justify-between border-t border-[#E6E6E6] pt-5">
            <span className="text-xs font-medium text-on-light-muted">
              Credit kept intact
            </span>
            <span className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white">
              Copy prompt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VersionVariant() {
  return (
    <section
      aria-labelledby="version-variant-title"
      className="grid gap-10"
      id="version-vs-variant"
    >
      <SectionIntro
        eyebrow="History & adaptations"
        title="Improve the same prompt—or take it somewhere new."
        text="The difference is simple: update one prompt, or adapt it into an independent prompt while keeping its source clear."
        id="version-variant-title"
      />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] bg-[#0D0D0D] p-6 text-white sm:p-10 dark:border dark:border-[#292929]">
          <p className="mb-8 font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
            One prompt, visible history
          </p>
          <div className="grid gap-4 font-mono text-sm sm:text-base">
            <div className="flex items-center gap-3">
              <span className="text-zinc-500 dark:text-zinc-300">
                Original Prompt
              </span>
              <span>v1</span>
              <span className="text-zinc-500 dark:text-zinc-300">→</span>
              <span>v2</span>
              <span className="text-zinc-500 dark:text-zinc-300">→</span>
              <span>v3</span>
            </div>
            <div className="pl-8 text-zinc-400">↓ Adapt this prompt</div>
            <div className="flex items-center gap-3 pl-8">
              <span>Adapted v1</span>
              <span className="text-zinc-500 dark:text-zinc-300">→</span>
              <span>v2</span>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <article className="rounded-[1.5rem] border border-[#E6E6E6] bg-white p-6 dark:border-[#292929] dark:bg-[#151515]">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-mid">
              Update
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.05em]">
              Update the same prompt.
            </h3>
            <p className="mt-2 text-sm leading-6 text-brand-mid">
              Keep improving one prompt while its earlier drafts remain
              available.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-[#E6E6E6] bg-white p-6 dark:border-[#292929] dark:bg-[#151515]">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-mid">
              Adapt this prompt
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.05em]">
              Create a new independent prompt.
            </h3>
            <p className="mt-2 text-sm leading-6 text-brand-mid">
              Build your own direction while keeping credit and origin clear.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function SharingSection() {
  return (
    <section
      aria-labelledby="sharing-title"
      className="grid gap-10"
      id="sharing"
    >
      <SectionIntro
        eyebrow="Share what works"
        title="Every public prompt can travel with a permanent link."
        text="Send a Vrompt link anywhere. The recipient opens the exact prompt first; account actions stay available when they are useful."
        id="sharing-title"
      />
      <div className="grid gap-4 rounded-[1.75rem] border border-[#E6E6E6] bg-white p-6 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center dark:border-[#292929] dark:bg-[#151515]">
        <div className="rounded-2xl bg-[#F3F3F1] p-5 font-mono text-sm text-on-light-muted dark:bg-[#242424] dark:text-zinc-300">
          vrompt.com/prompts/...
        </div>
        <ol className="grid gap-4 text-sm leading-6 text-brand-mid sm:grid-cols-3">
          <li>
            <span className="mb-2 block font-mono text-xs text-foreground">
              01
            </span>
            Recipient opens the exact public prompt.
          </li>
          <li>
            <span className="mb-2 block font-mono text-xs text-foreground">
              02
            </span>
            No login is needed to view public content.
          </li>
          <li>
            <span className="mb-2 block font-mono text-xs text-foreground">
              03
            </span>
            Save, comment, and adapt a prompt can request login when needed.
          </li>
        </ol>
      </div>
    </section>
  );
}

function SectionIntro({
  eyebrow,
  title,
  text,
  id,
}: {
  eyebrow: string;
  title: string;
  text: string;
  id: string;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[0.45fr_1fr] md:items-end md:gap-12">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-brand-mid">
        {eyebrow}
      </p>
      <div className="grid gap-4">
        <h2
          className="max-w-4xl text-[clamp(2.4rem,6vw,5.25rem)] font-semibold leading-[0.92] tracking-[-0.07em]"
          id={id}
        >
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-brand-mid sm:text-base">
          {text}
        </p>
      </div>
    </div>
  );
}
