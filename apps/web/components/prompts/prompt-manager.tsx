'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { CreatePromptForm } from '@/components/prompts/create-prompt-form';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button, getButtonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertModal, ConfirmationModal } from '@/components/ui/feedback-modal';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api';
import type { OwnedPromptRepository } from '@/lib/api';

export function PromptManager({ variantFrom }: { variantFrom?: string }) {
  const { accessToken } = useAuth();
  const [prompts, setPrompts] = useState<OwnedPromptRepository[] | null>(null);
  const [createOpen, setCreateOpen] = useState(Boolean(variantFrom));
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrompts = useCallback(async () => {
    if (!accessToken) return;
    try {
      const result = await apiRequest<OwnedPromptRepository[]>(
        '/prompt-repositories/mine',
        { accessToken },
      );
      setPrompts(result);
      setError(null);
    } catch {
      setError('Your prompts could not be loaded right now.');
    }
  }, [accessToken]);

  useEffect(() => {
    // The initial request synchronizes this workspace with the authenticated API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPrompts();
  }, [loadPrompts]);

  function requestClose() {
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    setCreateOpen(false);
  }

  function handleCreated() {
    setDirty(false);
    setCreateOpen(false);
    void loadPrompts();
  }

  return (
    <div className="grid gap-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0D0D0D] p-6 text-white shadow-[0_24px_70px_rgba(13,13,13,0.16)] sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full border-[40px] border-white/10" />
        <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge className="border-white/30 text-zinc-300">Workspace</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.07em] sm:text-6xl">
              Your prompts, in one place.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
              Create new prompt systems, revisit drafts, and manage everything
              you have published from one focused workspace.
            </p>
          </div>
          <Button
            className="shrink-0 border-white bg-white !text-[#0D0D0D] hover:bg-[#E6E6E6]"
            onClick={() => setCreateOpen(true)}
            variant="secondary"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            New prompt
          </Button>
        </div>
      </section>

      {!prompts ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-[1.5rem]" />
          <Skeleton className="h-64 rounded-[1.5rem]" />
        </div>
      ) : prompts.length === 0 ? (
        <Card className="grid min-h-72 place-items-center text-center">
          <div className="max-w-md">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
              Ready when you are
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              Create your first prompt.
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              Turn a useful workflow into something you can refine, reuse, and
              share.
            </p>
            <Button className="mt-6" onClick={() => setCreateOpen(true)}>
              New prompt
            </Button>
          </div>
        </Card>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {prompts.map((prompt) => (
            <Card
              className="group flex h-full flex-col transition hover:-translate-y-1 hover:shadow-xl"
              key={prompt.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>{prompt.visibility.toLowerCase()}</Badge>
                  <Badge>
                    {prompt.currentVersion?.status.toLowerCase() ?? 'empty'}
                  </Badge>
                </div>
                <span className="font-mono text-xs text-zinc-500">
                  v{prompt.currentVersion?.versionNumber ?? 0}
                </span>
              </div>
              <div className="mt-6 flex-1">
                <h2 className="text-2xl font-semibold tracking-[-0.05em]">
                  {prompt.title}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  {prompt.description || 'No description yet.'}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E6E6E6] pt-5 text-xs text-zinc-500 dark:border-[#4D4D4D]">
                <span>Updated {formatDate(prompt.updatedAt)}</span>
                <span>
                  {prompt._count.bookmarks} saves · {prompt._count.variants}{' '}
                  variants
                </span>
              </div>
              <Link
                className={getButtonClasses('secondary', 'mt-5 w-full')}
                href={`/p/${prompt.slug}`}
              >
                Open and manage
              </Link>
            </Card>
          ))}
        </section>
      )}

      <Modal
        className="max-w-5xl"
        description="Build the first version now. You can refine and publish more updates later."
        onClose={requestClose}
        open={createOpen}
        title={
          variantFrom ? 'Create a prompt variation' : 'Create a new prompt'
        }
      >
        <CreatePromptForm
          embedded
          key={createOpen ? `open-${variantFrom ?? 'new'}` : 'closed'}
          onCreated={handleCreated}
          onDirtyChange={setDirty}
          variantFrom={variantFrom}
        />
      </Modal>

      <ConfirmationModal
        confirmLabel="Discard draft"
        description="Your unsaved prompt details will be lost. This cannot be undone."
        destructive
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          setDirty(false);
          setCreateOpen(false);
        }}
        open={confirmClose}
        title="Discard this draft?"
      />
      <AlertModal
        description={error ?? 'Your prompts could not be loaded right now.'}
        onClose={() => setError(null)}
        open={Boolean(error)}
        title="Prompt workspace unavailable"
      />
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
