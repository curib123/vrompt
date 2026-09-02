'use client';

import { useEffect, useState } from 'react';

import { Button, getButtonClasses } from '@/components/ui/button';
import { trackAnalyticsEvent } from '@/lib/analytics';
import type { PromptRepositoryDetail } from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';
import {
  buildPromptPostTemplate,
  buildPublicPromptUrl,
  getSocialShareLinks,
} from '@/lib/prompt-sharing';
import type { SharePlatform } from '@/lib/prompt-sharing';

type ShareState = 'idle' | 'copied' | 'shared' | 'failed';

export function PromptShare({
  repository,
}: {
  repository: PromptRepositoryDetail;
}) {
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [state, setState] = useState<ShareState>('idle');
  const isShareable =
    repository.visibility === 'PUBLIC' && repository.status === 'ACTIVE';

  useEffect(() => {
    if (!isShareable) return;
    const timer = window.setTimeout(() => {
      const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      for (const origin of [configuredOrigin, window.location.origin]) {
        if (!origin) continue;
        try {
          setPublicUrl(
            buildPublicPromptUrl(repository.id, repository.slug, origin),
          );
          return;
        } catch {
          // Never expose a localhost URL as a public share link.
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isShareable, repository.id, repository.slug]);

  if (!isShareable) return null;

  const metadata = publicUrl
    ? {
        aiCompatibility: repository.aiCompatibility,
        description: repository.description,
        ownerUsername: repository.owner.username,
        sourcePromptTitle: repository.sourcePrompt?.title,
        title: repository.title,
        url: publicUrl,
      }
    : null;

  async function shareNative() {
    if (!metadata) return setState('failed');
    const nativeShare = (
      navigator as unknown as {
        share?: (data: ShareData) => Promise<void>;
      }
    ).share;
    trackAnalyticsEvent('prompt_share_clicked', {
      platform: nativeShare ? 'native' : 'copy',
      promptId: repository.id,
    });
    try {
      if (nativeShare) {
        await nativeShare.call(navigator, {
          title: `${repository.title} | Vrompt`,
          text: buildPromptPostTemplate(metadata),
          url: metadata.url,
        });
        trackAnalyticsEvent('prompt_share_native', {
          platform: 'native',
          promptId: repository.id,
        });
        setState('shared');
      } else {
        await copyLink();
      }
    } catch (error: unknown) {
      if ((error as Error).name !== 'AbortError') setState('failed');
    }
  }

  async function copyLink() {
    if (!metadata) return setState('failed');
    try {
      await copyToClipboard(metadata.url);
      trackAnalyticsEvent('prompt_link_copied', {
        platform: 'copy',
        promptId: repository.id,
      });
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  function trackPlatform(platform: SharePlatform) {
    const names = {
      facebook: 'prompt_share_facebook',
      x: 'prompt_share_x',
      linkedin: 'prompt_share_linkedin',
      reddit: 'prompt_share_reddit',
    } as const;
    trackAnalyticsEvent('prompt_share_clicked', {
      platform,
      promptId: repository.id,
    });
    if (platform in names) {
      trackAnalyticsEvent(names[platform as keyof typeof names], {
        platform,
        promptId: repository.id,
      });
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Share prompt"
    >
      <Button
        onClick={() => void shareNative()}
        type="button"
        variant="secondary"
      >
        {state === 'shared' ? 'Shared' : 'Share'}
      </Button>
      <Button onClick={() => void copyLink()} type="button" variant="secondary">
        {state === 'copied' ? 'Link copied' : 'Copy link'}
      </Button>
      {metadata ? (
        <details className="relative">
          <summary
            className={getButtonClasses(
              'secondary',
              'cursor-pointer list-none [&::-webkit-details-marker]:hidden',
            )}
          >
            Share to…
          </summary>
          <div className="absolute right-0 z-20 mt-2 grid min-w-44 gap-1 rounded-2xl border border-[#E6E6E6] bg-white p-2 text-on-light shadow-2xl dark:border-[#4D4D4D] dark:bg-[#1A1A1A] dark:text-on-dark">
            {getSocialShareLinks(metadata).map((link) => (
              <a
                aria-label={`Share on ${link.label}`}
                className="rounded-xl px-3 py-2 text-sm font-medium hover:bg-[#E6E6E6] dark:hover:bg-[#0D0D0D]"
                href={link.href}
                key={link.platform}
                onClick={() => trackPlatform(link.platform)}
                rel="noreferrer"
                target={link.platform === 'email' ? undefined : '_blank'}
              >
                {link.label}
              </a>
            ))}
          </div>
        </details>
      ) : null}
      {state === 'failed' ? (
        <span className="w-full text-xs text-zinc-400">
          Sharing needs a public NEXT_PUBLIC_SITE_URL and is disabled on
          localhost.
        </span>
      ) : null}
    </div>
  );
}
