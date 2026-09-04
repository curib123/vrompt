'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';

import { useAuth } from '@/components/providers/auth-provider';
import { AuthModalTrigger } from '@/components/auth/auth-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';
import type {
  AiUsageResponse,
  AiGenerationResponse,
  AiPromptDraft,
  AudienceOption,
  CategoryOption,
} from '@/lib/api';
import { ApiError, fetchAiUsage } from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';
import { trackAnalyticsEvent } from '@/lib/analytics';

type Operation = 'GENERATE' | 'REGENERATE' | 'IMPROVE' | 'EXPAND' | 'SHORTEN';

const guestDraftStorageKey = 'vrompt-guest-generated-draft';

export function GeneratorView() {
  const { accessToken, isLoading, user } = useAuth();
  const [goal, setGoal] = useState('');
  const [category, setCategory] = useState('');
  const [audience, setAudience] = useState('');
  const [draft, setDraft] = useState<AiPromptDraft | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [promptName, setPromptName] = useState('');
  const [busy, setBusy] = useState<Operation | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<AiUsageResponse | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(guestDraftStorageKey);
      if (!stored) return;
      const saved = JSON.parse(stored) as {
        draft?: AiPromptDraft;
        generationId?: string;
        content?: string;
        saveToken?: string;
      };
      if (saved.draft && saved.generationId && saved.saveToken) {
        // Restore the explicitly retained guest draft after the OAuth redirect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(saved.draft);
        setGenerationId(saved.generationId);
        setContent(saved.content || saved.draft.content);
      }
    } catch {
      window.sessionStorage.removeItem(guestDraftStorageKey);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    void fetchAiUsage(accessToken ?? undefined)
      .then(setUsage)
      .catch(() => undefined);
  }, [accessToken, isLoading]);

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      apiRequest<CategoryOption[]>('/categories'),
      apiRequest<AudienceOption[]>('/audiences'),
    ])
      .then(([nextCategories, nextAudiences]) => {
        setCategories(nextCategories);
        setAudiences(nextAudiences);
      })
      .catch(() => undefined);
  }, [user]);

  async function generate(operation: Operation) {
    if (goal.trim().length < 10 || busy) return;
    setBusy(operation);
    setError(null);
    setCopyState('idle');
    setSaveState('idle');
    try {
      const response = await apiRequest<AiGenerationResponse>('/ai/generate', {
        accessToken: accessToken ?? undefined,
        method: 'POST',
        body: JSON.stringify({
          goal,
          categorySlug: user ? category || undefined : undefined,
          audienceSlug: user ? audience || undefined : undefined,
          operation,
          basePrompt: draft ? content : undefined,
          requestId: crypto.randomUUID(),
        }),
      });
      if (!response.output) throw new Error('No prompt was returned.');
      setDraft(response.output);
      trackAnalyticsEvent('prompt_generated', undefined, accessToken);
      setGenerationId(response.id);
      setContent(response.output.content);
      if (!accessToken && response.saveToken) {
        window.sessionStorage.setItem(
          guestDraftStorageKey,
          JSON.stringify({
            draft: response.output,
            generationId: response.id,
            content: response.output.content,
            saveToken: response.saveToken,
          }),
        );
      }
      void fetchAiUsage(accessToken ?? undefined)
        .then(setUsage)
        .catch(() => undefined);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof ApiError && requestError.status === 429
          ? "You've reached your AI generation limit."
          : requestError instanceof ApiError && requestError.status === 403
            ? 'Sign in to use prompt refinement tools.'
            : requestError instanceof Error
              ? requestError.message
              : 'Generation failed. Try again.',
      );
    } finally {
      setBusy(null);
    }
  }

  async function copyPrompt() {
    try {
      await copyToClipboard(content);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2200);
    } catch {
      setCopyState('failed');
    }
  }

  async function savePrompt() {
    if (!generationId || !accessToken) return;
    try {
      await apiRequest(`/ai/generations/${generationId}/save`, {
        accessToken,
        body: JSON.stringify({
          content,
          title: promptName.trim() || undefined,
          saveToken: window.sessionStorage.getItem(guestDraftStorageKey)
            ? JSON.parse(
                window.sessionStorage.getItem(guestDraftStorageKey) as string,
              ).saveToken
            : undefined,
        }),
        method: 'POST',
      });
      setSaveState('saved');
      window.sessionStorage.removeItem(guestDraftStorageKey);
    } catch {
      setSaveState('failed');
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 pb-10 sm:gap-10">
      <header className="relative isolate grid gap-5 overflow-hidden rounded-[2rem] border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-100 p-6 shadow-[0_24px_70px_rgba(13,13,13,0.07)] sm:p-10 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:shadow-none">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-zinc-200/70 blur-3xl dark:bg-zinc-800/50"
        />
        <div className="relative grid gap-4">
          <Badge>
            <SparklesIcon />
            AI prompt generator
          </Badge>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.07em] sm:text-7xl">
            Start with the outcome. Get a prompt you can use.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-brand-mid">
            Describe what you want to accomplish in plain language. Vrompt turns
            it into a structured prompt you can review, edit, and copy.
          </p>
          {!user && !isLoading ? (
            <p className="max-w-2xl rounded-2xl border border-zinc-200 bg-white/70 p-4 text-sm leading-6 text-brand-mid dark:border-zinc-800 dark:bg-zinc-950/60">
              <strong className="text-foreground">Guest trial:</strong> generate
              and copy up to three prompts today. Sign in to save prompts, keep
              history, and adapt them later.
            </p>
          ) : null}
          {usage ? (
            <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="flex flex-wrap items-center gap-3 text-sm text-brand-mid">
                <Badge>{usage.plan} plan</Badge>
                <strong className="text-foreground">
                  {usage.plan === 'PRO'
                    ? 'Unlimited generations while Pro is active'
                    : `${usage.remaining} of ${usage.limit} generations left today`}
                </strong>
                {usage.plan !== 'PRO' ? (
                  <Link
                    className="inline-flex min-h-10 items-center rounded-full bg-[#0D0D0D] px-4 text-sm font-semibold !text-white transition hover:bg-[#242424] dark:bg-white dark:!text-black"
                    href={'/pricing' as Route}
                  >
                    Explore Pro
                  </Link>
                ) : null}
              </div>
              <p className="text-xs leading-5 text-brand-mid">
                {usage.plan === 'GUEST'
                  ? 'Guest usage is shared by devices on the same public IP address and resets daily at 00:00 UTC. Sign in for a personal Free allowance.'
                  : 'Your personal allowance resets daily at 00:00 UTC.'}
              </p>
              {usage.remaining === 0 ? (
                <p className="text-sm font-semibold text-foreground">
                  Today&apos;s allowance is used up. Explore Pro for unlimited
                  generations.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <Card className="border-zinc-200 p-5 shadow-[0_18px_50px_rgba(13,13,13,0.05)] sm:p-8 dark:border-zinc-800 dark:shadow-none">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void generate('GENERATE');
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold tracking-tight">
                Describe your outcome
              </p>
              <p className="mt-1 text-sm text-brand-mid">
                The more context you share, the more useful the prompt becomes.
              </p>
            </div>
            <span className="hidden rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-brand-mid sm:inline-flex dark:bg-zinc-900">
              Plain language is perfect
            </span>
          </div>
          <label
            className="grid gap-2 text-sm font-semibold"
            htmlFor="generation-goal"
          >
            What do you want AI to help you do?
            <Textarea
              id="generation-goal"
              maxLength={4000}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="Example: Help me review a product launch plan and identify risks, missing assumptions, and next steps."
              required
              value={goal}
            />
            <span className="text-right text-xs font-normal text-brand-mid">
              {goal.length.toLocaleString()} / 4,000 characters
            </span>
          </label>
          {user ? (
            <details className="rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <summary className="cursor-pointer text-sm font-semibold">
                More options
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label
                  className="grid gap-2 text-sm font-semibold"
                  htmlFor="generation-category"
                >
                  Category
                  <select
                    className="min-h-11 rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-950"
                    id="generation-category"
                    onChange={(event) => setCategory(event.target.value)}
                    value={category}
                  >
                    <option value="">Choose later</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  className="grid gap-2 text-sm font-semibold"
                  htmlFor="generation-audience"
                >
                  Audience
                  <select
                    className="min-h-11 rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-950"
                    id="generation-audience"
                    onChange={(event) => setAudience(event.target.value)}
                    value={audience}
                  >
                    <option value="">Choose later</option>
                    {audiences.map((item) => (
                      <option key={item.id} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </details>
          ) : null}
          <Button
            disabled={
              Boolean(busy) || goal.trim().length < 10 || usage?.remaining === 0
            }
            className="min-h-12 w-full sm:w-auto sm:px-8"
            type="submit"
          >
            <SparklesIcon />
            {busy === 'GENERATE'
              ? 'Generating...'
              : usage?.remaining === 0
                ? 'Daily limit reached'
                : 'Generate prompt'}
          </Button>
        </form>
      </Card>

      {busy && !draft ? (
        <Card>
          <Skeleton className="h-64" />
        </Card>
      ) : null}
      {error ? (
        <p
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {draft ? (
        <Card className="grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge>Editable draft</Badge>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
                {draft.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-brand-mid">
                {draft.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {draft.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>
          <label
            className="grid gap-2 text-sm font-semibold"
            htmlFor="generated-content"
          >
            <span>Give it a name (optional)</span>
            <input
              className="min-h-11 rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-950"
              maxLength={160}
              minLength={5}
              onChange={(event) => setPromptName(event.target.value)}
              placeholder="e.g. Weekly launch risk review"
              value={promptName}
            />
            {promptName.trim().length > 0 && promptName.trim().length < 5 ? (
              <span className="text-xs font-normal text-amber-700 dark:text-amber-300">
                Use at least 5 characters, or leave the name blank.
              </span>
            ) : null}
            Review and edit your prompt
            <textarea
              className="min-h-80 w-full rounded-3xl border border-zinc-300 bg-white px-4 py-3 font-mono text-sm leading-7 text-foreground outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-white"
              id="generated-content"
              onChange={(event) => setContent(event.target.value)}
              value={content}
            />
          </label>
          {draft.variables.length > 0 ? (
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
              <p className="text-sm font-semibold">Suggested variables</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {draft.variables.map((variable) => (
                  <div className="text-sm" key={variable.name}>
                    <span className="font-mono">{`{{${variable.name}}}`}</span>
                    <span className="ml-2 text-brand-mid">
                      {variable.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void copyPrompt()} type="button">
              {copyState === 'copied' ? 'Copied' : 'Copy prompt'}
            </Button>
            {user ? (
              <Button
                disabled={
                  promptName.trim().length > 0 && promptName.trim().length < 5
                }
                onClick={() => void savePrompt()}
                type="button"
                variant="secondary"
              >
                {saveState === 'saved'
                  ? 'Saved as private draft'
                  : 'Save to my prompts'}
              </Button>
            ) : (
              <AuthModalTrigger
                className="inline-flex min-h-11 items-center rounded-full border border-zinc-300 px-5 text-sm font-medium dark:border-zinc-700"
                description="Sign in to save this generated prompt to your private Vrompt library."
                returnTo="/generate"
                title="Save your generated prompt"
              >
                Sign in to save
              </AuthModalTrigger>
            )}
          </div>
          {copyState === 'failed' || saveState === 'failed' ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {copyState === 'failed'
                ? 'Copy failed. Try selecting the text manually.'
                : 'Could not save this draft.'}
            </p>
          ) : null}
          <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <p className="text-sm font-semibold">Refine this prompt</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                ['IMPROVE', 'EXPAND', 'SHORTEN', 'REGENERATE'] as Operation[]
              ).map((operation) => (
                <Button
                  disabled={Boolean(busy) || !usage?.advancedTools}
                  key={operation}
                  onClick={() => void generate(operation)}
                  type="button"
                  variant="secondary"
                >
                  {busy === operation
                    ? 'Working...'
                    : operation.charAt(0) + operation.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
            {usage?.plan === 'GUEST' ? (
              <p className="mt-3 text-xs text-brand-mid">
                Sign in for a personal Free allowance. Free members can use
                every generation and refinement tool within their daily limit.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="m12 3-1.1 4.1L7 8.2l3.9 1.1L12 13l1.1-3.7L17 8.2l-3.9-1.1L12 3Z" />
      <path d="m19 14-.6 2.4L16 17l2.4.6L19 20l.6-2.4L22 17l-2.4-.6L19 14ZM5 14l-.5 1.8L3 16.2l1.5.4L5 18l.5-1.4 1.5-.4-1.5-.4L5 14Z" />
    </svg>
  );
}
