'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { apiRequest, getMediaUrl } from '@/lib/api';
import type { PromptRepositoryDetail } from '@/lib/api';

export function RepositoryDetail({ slug }: { slug: string }) {
  const { accessToken, isLoading } = useAuth();
  const [repository, setRepository] = useState<PromptRepositoryDetail | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] =
    useState<
      PromptRepositoryDetail['currentVersion'] extends infer Version
        ? Version extends { evidenceImages: infer Images }
          ? Images extends Array<infer Image>
            ? Image
            : never
          : never
        : never
    >();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    let active = true;
    void apiRequest<PromptRepositoryDetail>(
      `/prompt-repositories/${encodeURIComponent(slug)}`,
      {
        accessToken: accessToken ?? undefined,
      },
    )
      .then((result) => {
        if (active) {
          setRepository(result);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            'This repository is private, unavailable, or does not exist.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken, isLoading, slug]);

  if (isLoading || (!repository && !error)) {
    return (
      <Card>
        <p className="text-sm text-zinc-500">Loading repository...</p>
      </Card>
    );
  }

  if (!repository) {
    return (
      <EmptyState
        actionHref="/explore"
        actionLabel="Explore prompts"
        description={error ?? 'Repository unavailable.'}
        title="Repository unavailable"
      />
    );
  }

  const version = repository.currentVersion;
  const displayName =
    repository.owner.profile?.displayName || repository.owner.username;
  const evidenceImages = version?.evidenceImages ?? [];

  return (
    <div className="grid gap-8">
      <Card className="relative overflow-hidden border-[#0D0D0D] bg-[#0D0D0D] text-white dark:border-white">
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full border-[40px] border-white/10" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/30 text-zinc-300">
                {repository.visibility.toLowerCase()}
              </Badge>
              {repository.category ? (
                <Badge className="border-white/30 text-zinc-300">
                  {repository.category.name}
                </Badge>
              ) : null}
              {version ? (
                <Badge className="border-white/30 text-zinc-300">
                  Version {version.versionNumber}
                </Badge>
              ) : null}
            </div>
            <div>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.07em] sm:text-7xl">
                {repository.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-300">
                {repository.description || 'A reusable prompt repository.'}
              </p>
            </div>
            <Link
              className="inline-flex items-center gap-3 text-sm text-zinc-300 hover:text-white"
              href={`/u/${repository.owner.username}`}
            >
              <Avatar
                avatar={getMediaUrl(repository.owner.profile?.avatar ?? null)}
                className="size-9 border-white/30 bg-white/10 text-white"
                name={displayName}
              />
              <span>
                By <strong className="text-white">{displayName}</strong>{' '}
                <span className="font-mono">@{repository.owner.username}</span>
              </span>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled type="button" variant="secondary">
              Copy Prompt
            </Button>
            <Button disabled type="button" variant="secondary">
              Save
            </Button>
            <Button disabled type="button" variant="secondary">
              Create Variant
            </Button>
            <Button disabled type="button" variant="secondary">
              Share
            </Button>
          </div>
        </div>
      </Card>

      <Tabs
        items={[
          {
            content: <OverviewTab repository={repository} />,
            id: 'overview',
            label: 'Overview',
          },
          {
            content: (
              <PromptTab
                content={version?.content ?? 'No prompt content is available.'}
              />
            ),
            id: 'prompt',
            label: 'Prompt',
          },
          {
            content: (
              <VersionsTab versionNumber={version?.versionNumber ?? 1} />
            ),
            id: 'versions',
            label: 'Versions',
          },
          {
            content: (
              <ExamplesTab
                evidenceImages={evidenceImages}
                examples={version?.examples ?? []}
                onSelectImage={setSelectedImage}
              />
            ),
            id: 'examples',
            label: 'Examples',
          },
          {
            content: (
              <EmptyState
                description="Variants will be connected here in the next evolution phase."
                title="No Variant Lineage yet"
              />
            ),
            id: 'variants',
            label: 'Variants',
          },
          {
            content: (
              <EmptyState
                description="Activity history will appear as this repository evolves."
                title="No activity yet"
              />
            ),
            id: 'activity',
            label: 'Activity',
          },
        ]}
      />

      <Modal
        description={
          selectedImage?.caption || selectedImage?.altText || 'Evidence image'
        }
        onClose={() => setSelectedImage(undefined)}
        open={Boolean(selectedImage)}
        title={selectedImage?.originalFilename || 'Evidence image'}
      >
        {selectedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={selectedImage.altText || selectedImage.originalFilename}
            className="max-h-[70vh] w-full rounded-2xl object-contain"
            src={
              getMediaUrl(selectedImage.secureUrl) ?? selectedImage.secureUrl
            }
          />
        ) : null}
      </Modal>
    </div>
  );
}

function OverviewTab({ repository }: { repository: PromptRepositoryDetail }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <InfoCard
        label="AI compatibility"
        value={repository.aiCompatibility || 'Model agnostic'}
      />
      <InfoCard label="License" value={repository.license || 'Not specified'} />
      <InfoCard label="Updated" value={formatDate(repository.updatedAt)} />
    </div>
  );
}

function PromptTab({ content }: { content: string }) {
  return (
    <Card className="overflow-hidden bg-[#0D0D0D] p-0 text-white dark:border-white">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
          Current prompt
        </span>
        <span className="text-xs text-zinc-500">Read-only preview</span>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap p-6 font-mono text-sm leading-8 text-zinc-200">
        {content}
      </pre>
    </Card>
  );
}

function VersionsTab({ versionNumber }: { versionNumber: number }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Badge>Current version</Badge>
          <h2 className="mt-4 text-2xl font-semibold">
            Version {versionNumber}
          </h2>
        </div>
        <p className="text-sm text-zinc-500">
          Version history arrives in Phase 12.
        </p>
      </div>
    </Card>
  );
}

function ExamplesTab({
  evidenceImages,
  examples,
  onSelectImage,
}: {
  evidenceImages: NonNullable<
    PromptRepositoryDetail['currentVersion']
  >['evidenceImages'];
  examples: NonNullable<PromptRepositoryDetail['currentVersion']>['examples'];
  onSelectImage: (image: (typeof evidenceImages)[number]) => void;
}) {
  return (
    <div className="grid gap-6">
      {examples.map((example, index) => (
        <Card key={example.id}>
          <Badge>{example.title || `Example ${index + 1}`}</Badge>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <CodeBlock label="Input" value={example.input} />
            <CodeBlock label="Output" value={example.output} />
          </div>
        </Card>
      ))}
      {evidenceImages.length > 0 ? (
        <Card>
          <div className="space-y-2">
            <Badge>Evidence</Badge>
            <h2 className="text-2xl font-semibold">Observed results</h2>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {evidenceImages.map((image) => (
              <button
                className="group overflow-hidden rounded-2xl border border-zinc-200 text-left dark:border-zinc-800"
                key={image.id}
                onClick={() => onSelectImage(image)}
                type="button"
              >
                {/* Evidence thumbnails stay lazy and preserve the source aspect ratio. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={image.altText || image.originalFilename}
                  className="aspect-square w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                  src={getMediaUrl(image.secureUrl) ?? image.secureUrl}
                />
                {image.caption ? (
                  <span className="block p-3 text-xs text-zinc-600 dark:text-zinc-400">
                    {image.caption}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </Card>
      ) : null}
      <p className="text-sm leading-6 text-zinc-500">
        AI results may vary by model, settings, and model version.
      </p>
      {examples.length === 0 && evidenceImages.length === 0 ? (
        <EmptyState
          description="Examples and evidence can be added when this repository evolves."
          title="No examples yet"
        />
      ) : null}
    </div>
  );
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-900">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <pre className="mt-3 whitespace-pre-wrap font-mono text-sm leading-6">
        {value}
      </pre>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="space-y-2 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="text-lg font-semibold">{value}</p>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
