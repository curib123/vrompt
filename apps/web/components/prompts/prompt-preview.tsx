'use client';

import Link from 'next/link';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button, getButtonClasses } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { apiRequest } from '@/lib/api';
import type { PromptRepositoryDetail } from '@/lib/api';
import { cn } from '@/lib/cn';
import { copyToClipboard, getCopyClientKey } from '@/lib/clipboard';

type PromptPreviewSeed = {
  description?: string | null;
  slug: string;
  title: string;
};

type PromptPreviewContextValue = {
  openPrompt: (prompt: PromptPreviewSeed) => void;
};

const PromptPreviewContext = createContext<PromptPreviewContextValue | null>(
  null,
);

export function PromptPreviewProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const cacheRef = useRef(new Map<string, PromptRepositoryDetail>());
  const [selected, setSelected] = useState<PromptPreviewSeed | null>(null);
  const [repository, setRepository] = useState<PromptRepositoryDetail | null>(
    null,
  );
  const [error, setError] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );

  const openPrompt = useCallback((prompt: PromptPreviewSeed) => {
    setSelected(prompt);
    setRepository(cacheRef.current.get(prompt.slug) ?? null);
    setError(false);
    setCopyState('idle');
    setShareState('idle');
  }, []);

  const contextValue = useMemo(() => ({ openPrompt }), [openPrompt]);

  useEffect(() => {
    if (!selected) return;

    const cached = cacheRef.current.get(selected.slug);
    if (cached) {
      setRepository(cached);
      return;
    }

    let active = true;
    setRepository(null);
    setError(false);
    void apiRequest<PromptRepositoryDetail>(
      `/prompt-repositories/${encodeURIComponent(selected.slug)}`,
      { accessToken: accessToken ?? undefined },
    )
      .then((result) => {
        if (!active) return;
        cacheRef.current.set(selected.slug, result);
        setRepository(result);
        trackAnalyticsEvent(
          'repository_viewed',
          {
            hasEvidence: Boolean(result.currentVersion?.evidenceImages.length),
          },
          accessToken,
        );
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, [accessToken, selected]);

  function closePreview() {
    setSelected(null);
  }

  async function copyPrompt() {
    if (!repository?.currentVersion) return;

    try {
      await copyToClipboard(repository.currentVersion.content);
      setCopyState('copied');
      trackAnalyticsEvent('prompt_copied', undefined, accessToken);
      void apiRequest<{ copyCount: number }>(
        `/prompt-repositories/${encodeURIComponent(repository.slug)}/copy`,
        {
          accessToken: accessToken ?? undefined,
          body: JSON.stringify({ clientKey: getCopyClientKey() }),
          method: 'POST',
        },
      )
        .then((result) => {
          const updated = { ...repository, copyCount: result.copyCount };
          cacheRef.current.set(repository.slug, updated);
          setRepository(updated);
        })
        .catch(() => undefined);
      window.setTimeout(() => setCopyState('idle'), 2200);
    } catch {
      setCopyState('failed');
    }
  }

  async function sharePrompt() {
    if (!repository) return;

    const url = getPromptUrl(repository.slug);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${repository.title} | Vrompt`,
          text: repository.description || 'A useful prompt from Vrompt.',
          url,
        });
        return;
      }

      await copyToClipboard(url);
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 2200);
    } catch (shareError: unknown) {
      if ((shareError as Error).name !== 'AbortError') setShareState('failed');
    }
  }

  const modalTitle = repository?.title ?? selected?.title ?? 'Prompt preview';
  const modalDescription =
    repository?.description ??
    selected?.description ??
    'Preview the prompt, copy it, or share it with someone.';

  return (
    <PromptPreviewContext.Provider value={contextValue}>
      {children}
      <Modal
        className="max-w-3xl"
        description={modalDescription}
        onClose={closePreview}
        open={Boolean(selected)}
        title={modalTitle}
      >
        {repository ? (
          <PromptPreviewContent
            copyState={copyState}
            onCopy={() => void copyPrompt()}
            onShare={() => void sharePrompt()}
            repository={repository}
            shareState={shareState}
          />
        ) : error && selected ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#BDBDBD] p-6 text-center dark:border-[#4D4D4D]">
            <p className="font-semibold">This preview could not be loaded.</p>
            <p className="mt-2 text-sm text-zinc-500">
              Open the full page to try again or browse another prompt.
            </p>
            <Link
              className={getButtonClasses('primary', 'mt-5')}
              href={`/p/${selected.slug}`}
            >
              View full page
            </Link>
          </div>
        ) : (
          <PreviewSkeleton />
        )}
      </Modal>
    </PromptPreviewContext.Provider>
  );
}

export function PromptPreviewCard({
  children,
  className,
  description,
  slug,
  title,
}: PromptPreviewSeed & { children: ReactNode; className?: string }) {
  const { openPrompt } = usePromptPreview();

  return (
    <button
      aria-label={`Preview ${title}`}
      className={cn(
        'min-w-0 w-full rounded-[1.5rem] border border-[#E6E6E6] bg-white/95 p-4 text-left shadow-[0_18px_50px_rgba(13,13,13,0.06)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[#0D0D0D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D0D0D] sm:p-6 dark:border-[#1A1A1A] dark:bg-[#1A1A1A]/95 dark:hover:border-white dark:focus-visible:outline-white',
        className,
      )}
      onClick={() => openPrompt({ description, slug, title })}
      type="button"
    >
      {children}
    </button>
  );
}

function PromptPreviewContent({
  copyState,
  onCopy,
  onShare,
  repository,
  shareState,
}: {
  copyState: 'idle' | 'copied' | 'failed';
  onCopy: () => void;
  onShare: () => void;
  repository: PromptRepositoryDetail;
  shareState: 'idle' | 'copied' | 'failed';
}) {
  const version = repository.currentVersion;
  const promptUrl = getPromptUrl(repository.slug);
  const socialLinks = getSocialShareLinks(
    promptUrl,
    repository.title,
    repository.description,
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {repository.category ? <Badge>{repository.category.name}</Badge> : null}
        {repository.aiCompatibility ? (
          <Badge>{repository.aiCompatibility}</Badge>
        ) : null}
        {version ? <Badge>Update {version.versionNumber}</Badge> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <Link
          className="font-semibold text-[#0D0D0D] underline underline-offset-4 dark:text-white"
          href={`/u/${repository.owner.username}`}
        >
          By @{repository.owner.username}
        </Link>
        <span>
          {repository.copyCount} copies · {repository.saveCount} saves ·{' '}
          {repository.likeCount} likes
        </span>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] bg-[#0D0D0D] text-white">
        <div className="border-b border-white/10 px-5 py-3 font-mono text-xs uppercase tracking-[0.18em] text-zinc-400">
          Ready to use
        </div>
        <pre className="max-h-[38dvh] overflow-auto whitespace-pre-wrap p-5 font-mono text-sm leading-7 text-zinc-200 sm:p-6">
          {version?.content || 'Prompt content is not available.'}
        </pre>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Button
          className="w-full"
          disabled={!version}
          onClick={onCopy}
          type="button"
        >
          {copyState === 'copied' ? 'Prompt copied' : 'Copy prompt'}
        </Button>
        <Link
          className={getButtonClasses('secondary', 'w-full whitespace-nowrap')}
          href={`/p/${repository.slug}`}
        >
          View full details
        </Link>
      </div>
      {copyState === 'failed' ? (
        <p className="text-sm text-red-600">
          Could not copy. Please try again.
        </p>
      ) : null}

      <div className="border-t border-[#E6E6E6] pt-5 dark:border-[#1A1A1A]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-semibold">Share this prompt</p>
            <p className="mt-1 text-xs text-zinc-500">
              Send the public prompt page in one tap.
            </p>
          </div>
          <Button onClick={onShare} type="button" variant="secondary">
            {shareState === 'copied' ? 'Link copied' : 'Share'}
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {socialLinks.map((link) => (
            <a
              aria-label={`Share on ${link.label}`}
              className={getButtonClasses(
                'ghost',
                'min-h-10 border border-[#E6E6E6] px-3 py-2 dark:border-[#4D4D4D]',
              )}
              href={link.href}
              key={link.label}
              rel="noreferrer"
              target="_blank"
            >
              {link.label}
            </a>
          ))}
        </div>
        {shareState === 'failed' ? (
          <p className="mt-3 text-sm text-red-600">
            Sharing is unavailable. Try a platform below.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function usePromptPreview() {
  const context = useContext(PromptPreviewContext);
  if (!context) {
    throw new Error(
      'PromptPreviewCard must be used inside PromptPreviewProvider',
    );
  }
  return context;
}

function getPromptUrl(slug: string) {
  return new URL(`/p/${slug}`, window.location.origin).toString();
}

function getSocialShareLinks(
  url: string,
  title: string,
  description: string | null,
) {
  const message = `${title} - ${description || 'A useful prompt from Vrompt.'}`;
  return [
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`,
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`,
    },
  ];
}

function PreviewSkeleton() {
  return (
    <div className="grid gap-4" role="status">
      <span className="sr-only">Loading prompt preview</span>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-56 rounded-[1.5rem]" />
      <Skeleton className="h-12 rounded-full" />
    </div>
  );
}
