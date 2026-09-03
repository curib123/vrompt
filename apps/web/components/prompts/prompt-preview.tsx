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
import {
  buildPromptPostTemplate,
  buildPublicPromptUrl,
  getPublicPromptPath,
  getSocialShareLinks,
} from '@/lib/prompt-sharing';

type ShareState = 'idle' | 'link-copied' | 'post-copied' | 'shared' | 'failed';

type PromptPreviewSeed = {
  description?: string | null;
  onOpen?: () => void;
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
  const [shareState, setShareState] = useState<ShareState>('idle');

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

    try {
      const url = getPromptUrl(repository);
      if (!url) throw new Error('Public share URL unavailable');
      const post = getPromptPost(repository, url);
      const nativeShare = (
        navigator as unknown as {
          share?: (data: ShareData) => Promise<void>;
        }
      ).share;
      trackAnalyticsEvent('prompt_share_clicked', {
        platform: nativeShare ? 'native' : 'copy',
        promptId: repository.id,
      });
      if (nativeShare) {
        await nativeShare.call(navigator, {
          title: `${repository.title} | Vrompt`,
          text: post,
          url,
        });
        trackAnalyticsEvent('prompt_share_native', {
          platform: 'native',
          promptId: repository.id,
        });
        setShareState('shared');
        window.setTimeout(() => setShareState('idle'), 2200);
        return;
      }

      await copyToClipboard(post);
      setShareState('post-copied');
      window.setTimeout(() => setShareState('idle'), 2200);
    } catch (shareError: unknown) {
      if ((shareError as Error).name !== 'AbortError') setShareState('failed');
    }
  }

  async function copyShareLink() {
    if (!repository) return;

    try {
      const url = getPromptUrl(repository);
      if (!url) throw new Error('Public share URL unavailable');
      await copyToClipboard(url);
      trackAnalyticsEvent('prompt_link_copied', {
        platform: 'copy',
        promptId: repository.id,
      });
      setShareState('link-copied');
      window.setTimeout(() => setShareState('idle'), 2200);
    } catch {
      setShareState('failed');
    }
  }

  async function copySharePost() {
    if (!repository) return;

    try {
      const url = getPromptUrl(repository);
      if (!url) throw new Error('Public share URL unavailable');
      await copyToClipboard(getPromptPost(repository, url));
      setShareState('post-copied');
      window.setTimeout(() => setShareState('idle'), 2200);
    } catch {
      setShareState('failed');
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
            onCopyLink={() => void copyShareLink()}
            onCopyPost={() => void copySharePost()}
            onShare={() => void sharePrompt()}
            repository={repository}
            shareState={shareState}
          />
        ) : error && selected ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#BDBDBD] p-6 text-center dark:border-[#4D4D4D]">
            <p className="font-semibold">This preview could not be loaded.</p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
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
  onOpen,
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
      onClick={() => {
        onOpen?.();
        openPrompt({ description, onOpen, slug, title });
      }}
      type="button"
    >
      {children}
    </button>
  );
}

function PromptPreviewContent({
  copyState,
  onCopy,
  onCopyLink,
  onCopyPost,
  onShare,
  repository,
  shareState,
}: {
  copyState: 'idle' | 'copied' | 'failed';
  onCopy: () => void;
  onCopyLink: () => void;
  onCopyPost: () => void;
  onShare: () => void;
  repository: PromptRepositoryDetail;
  shareState: ShareState;
}) {
  const version = repository.currentVersion;
  const promptUrl = getPromptUrl(repository);
  const postTemplate = promptUrl ? getPromptPost(repository, promptUrl) : '';
  const isShareable =
    repository.visibility === 'PUBLIC' &&
    repository.status === 'ACTIVE' &&
    Boolean(promptUrl);
  const socialLinks = promptUrl
    ? getSocialShareLinks(getPromptShareMetadata(repository, promptUrl))
    : [];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {repository.category ? <Badge>{repository.category.name}</Badge> : null}
        {repository.origin === 'AI_GENERATED' ? (
          <Badge>AI-generated</Badge>
        ) : null}
        {repository.origin === 'IMPORTED' ? <Badge>Imported</Badge> : null}
        {repository.aiCompatibility ? (
          <Badge>{repository.aiCompatibility}</Badge>
        ) : null}
        {version ? <Badge>Update {version.versionNumber}</Badge> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400">
        <Link
          className="font-semibold text-foreground underline underline-offset-4"
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
          href={getPublicPromptPath(repository.id, repository.slug)}
        >
          View full details
        </Link>
      </div>
      {copyState === 'failed' ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Could not copy. Please try again.
        </p>
      ) : null}

      <div className="border-t border-[#E6E6E6] pt-5 dark:border-[#1A1A1A]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-semibold">Share this prompt</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Create a ready-to-post message or copy its public details link.
            </p>
          </div>
          {isShareable ? (
            <Button onClick={onShare} type="button" variant="secondary">
              {shareState === 'shared' ? 'Shared' : 'Share'}
            </Button>
          ) : null}
        </div>
        {isShareable ? (
          <>
            <textarea
              aria-label="Share post template"
              className="mt-4 min-h-40 w-full resize-y rounded-2xl border border-[#E6E6E6] bg-[#F7F7F7] p-4 text-sm leading-6 text-foreground outline-none dark:border-[#4D4D4D] dark:bg-[#111111]"
              readOnly
              value={postTemplate}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button onClick={onCopyPost} type="button">
                {shareState === 'post-copied'
                  ? 'Post copied'
                  : 'Copy post template'}
              </Button>
              <Button onClick={onCopyLink} type="button" variant="secondary">
                {shareState === 'link-copied'
                  ? 'Public link copied'
                  : 'Copy public link'}
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
                  onClick={() => {
                    trackAnalyticsEvent('prompt_share_clicked', {
                      platform: link.platform,
                      promptId: repository.id,
                    });
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
            {shareState === 'failed' ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                Sharing is unavailable. Copy the post or public link instead.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            Set this prompt to Public or Unlisted before sharing its details
            link.
          </p>
        )}
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

function getPromptUrl(repository: PromptRepositoryDetail) {
  for (const origin of [
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    typeof window === 'undefined' ? undefined : window.location.origin,
  ]) {
    if (!origin) continue;
    try {
      return buildPublicPromptUrl(repository.id, repository.slug, origin);
    } catch {
      // Localhost is intentionally not a public sharing destination.
    }
  }
  return null;
}

function getPromptPost(repository: PromptRepositoryDetail, url: string) {
  return buildPromptPostTemplate(getPromptShareMetadata(repository, url));
}

function getPromptShareMetadata(
  repository: PromptRepositoryDetail,
  url: string,
) {
  return {
    aiCompatibility: repository.aiCompatibility,
    description: repository.description,
    ownerUsername: repository.owner.username,
    sourcePromptTitle: repository.sourcePrompt?.title,
    title: repository.title,
    url,
  };
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
