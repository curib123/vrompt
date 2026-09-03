'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';

import { useAuth } from '@/components/providers/auth-provider';
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

type Operation = 'GENERATE' | 'REGENERATE' | 'IMPROVE' | 'EXPAND' | 'SHORTEN';

export function GeneratorView() {
  const { accessToken, user } = useAuth();
  const [goal, setGoal] = useState('');
  const [category, setCategory] = useState('');
  const [audience, setAudience] = useState('');
  const [draft, setDraft] = useState<AiPromptDraft | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [busy, setBusy] = useState<Operation | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<AiUsageResponse | null>(null);

  useEffect(() => {
    void Promise.all([
      apiRequest<CategoryOption[]>('/categories'),
      apiRequest<AudienceOption[]>('/audiences'),
    ])
      .then(([nextCategories, nextAudiences]) => {
        setCategories(nextCategories);
        setAudiences(nextAudiences);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    void fetchAiUsage(accessToken)
      .then(setUsage)
      .catch(() => undefined);
  }, [accessToken]);

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
          categorySlug: category || undefined,
          audienceSlug: audience || undefined,
          operation,
          basePrompt: draft ? content : undefined,
          requestId: crypto.randomUUID(),
        }),
      });
      if (!response.output) throw new Error('No prompt was returned.');
      setDraft(response.output);
      setGenerationId(response.id);
      setContent(response.output.content);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof ApiError && requestError.status === 429
          ? "You've reached your AI generation limit."
          : requestError instanceof ApiError && requestError.status === 403
            ? 'Prompt refinement is available with Vrompt Pro.'
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
        body: JSON.stringify({ content }),
        method: 'POST',
      });
      setSaveState('saved');
    } catch {
      setSaveState('failed');
    }
  }

  return (
    <div className="grid gap-8">
      <header className="grid gap-4">
        <Badge>AI prompt generator</Badge>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.07em] sm:text-7xl">
          Start with the outcome. Get a prompt you can use.
        </h1>
        <p className="max-w-2xl text-base leading-8 text-brand-mid">
          Describe what you want to accomplish in plain language. Vrompt turns
          it into a structured prompt you can review, edit, and copy.
        </p>
        {usage ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-brand-mid">
            <Badge>{usage.plan} plan</Badge>
            <span>{usage.remaining} AI generations left today</span>
            {usage.plan === 'FREE' ? (
              <Link
                className="font-semibold underline underline-offset-4"
                href={'/pricing' as Route}
              >
                See Pro
              </Link>
            ) : null}
          </div>
        ) : null}
      </header>

      <Card>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void generate('GENERATE');
          }}
        >
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
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className="grid gap-2 text-sm font-semibold"
              htmlFor="generation-category"
            >
              Category{' '}
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
              Audience{' '}
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
          <Button
            disabled={Boolean(busy) || goal.trim().length < 10}
            type="submit"
          >
            {busy === 'GENERATE' ? 'Generating...' : 'Generate prompt'}
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
                onClick={() => void savePrompt()}
                type="button"
                variant="secondary"
              >
                {saveState === 'saved'
                  ? 'Saved as private draft'
                  : 'Save to my prompts'}
              </Button>
            ) : (
              <Link
                className="inline-flex min-h-11 items-center rounded-full border border-zinc-300 px-5 text-sm font-medium dark:border-zinc-700"
                href="/login"
              >
                Sign in to save
              </Link>
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
                  disabled={Boolean(busy)}
                  key={operation}
                  onClick={() => void generate(operation)}
                  type="button"
                  variant="secondary"
                >
                  {busy === operation
                    ? 'Working...'
                    : operation.charAt(0) +
                      operation.slice(1).toLowerCase() +
                      (usage?.plan === 'PRO' ? '' : ' · Pro')}
                </Button>
              ))}
            </div>
            {usage?.plan !== 'PRO' ? (
              <p className="mt-3 text-xs text-brand-mid">
                Refinement tools are part of Vrompt Pro. You can still generate
                and copy a prompt on Free.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
