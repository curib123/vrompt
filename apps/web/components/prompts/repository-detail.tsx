'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getButtonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, getMediaUrl } from '@/lib/api';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { copyToClipboard, getCopyClientKey } from '@/lib/clipboard';
import { ReportRepositoryButton } from '@/components/reports/report-repository-button';
import { PromptAudienceEditor } from '@/components/audiences/prompt-audience-editor';
import { PromptShare } from '@/components/prompts/prompt-share';
import { getPublicPromptPath } from '@/lib/prompt-sharing';
import type {
  PromptEvidenceImage,
  PromptVersionContent,
  PromptVersionDetail,
  PromptVersionSummary,
  PromptRepositoryDetail,
  PromptLineageNode,
  PromptLineageResponse,
  CommentItem,
  CommentsResponse,
  RepositoryActivityResponse,
} from '@/lib/api';

export function RepositoryDetail({
  slug,
  initialRepository = null,
  initialTab,
  publicPath,
}: {
  slug: string;
  initialRepository?: PromptRepositoryDetail | null;
  initialTab?: string;
  publicPath?: string;
}) {
  const { accessToken, isLoading, user } = useAuth();
  const [repository, setRepository] = useState<PromptRepositoryDetail | null>(
    initialRepository,
  );
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<
    'idle' | 'copying' | 'copied' | 'failed'
  >('idle');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'failed'>(
    'idle',
  );
  const [likeState, setLikeState] = useState<'idle' | 'liking' | 'failed'>(
    'idle',
  );
  const [selectedImage, setSelectedImage] = useState<PromptEvidenceImage>();
  const [selectedVersion, setSelectedVersion] = useState<PromptVersionDetail>();

  useEffect(() => {
    if (isLoading || (initialRepository && !accessToken)) {
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
          trackAnalyticsEvent(
            'repository_viewed',
            {
              hasEvidence: Boolean(
                result.currentVersion?.evidenceImages?.length,
              ),
            },
            accessToken,
          );
        }
      })
      .catch(() => {
        if (active) {
          setError('This prompt is private, unavailable, or does not exist.');
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken, initialRepository, isLoading, slug]);

  if (!repository && (isLoading || !error)) {
    return (
      <Card>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Loading prompt...
        </p>
      </Card>
    );
  }

  if (!repository) {
    return (
      <EmptyState
        actionHref="/explore"
        actionLabel="Explore prompts"
        description={error ?? 'Prompt unavailable.'}
        title="Prompt unavailable"
      />
    );
  }

  const version = repository.currentVersion;
  const activeVersion: PromptVersionContent | null = selectedVersion ?? version;
  const displayName =
    repository.owner.profile?.displayName || repository.owner.username;
  const evidenceImages = activeVersion?.evidenceImages ?? [];
  const promptPath =
    publicPath ?? getPublicPromptPath(repository.id, repository.slug);

  async function copyPrompt() {
    if (!version || copyState === 'copying') {
      return;
    }

    setCopyState('copying');

    try {
      await copyToClipboard(version.content);
      const clientKey = getCopyClientKey();
      const result = await apiRequest<{ copyCount: number }>(
        `/prompt-repositories/${encodeURIComponent(slug)}/copy`,
        {
          accessToken: accessToken ?? undefined,
          body: JSON.stringify({ clientKey }),
          method: 'POST',
        },
      );
      setRepository((current) =>
        current ? { ...current, copyCount: result.copyCount } : current,
      );
      setCopyState('copied');
      trackAnalyticsEvent('prompt_copied', undefined, accessToken);
      window.setTimeout(() => setCopyState('idle'), 2200);
    } catch {
      setCopyState('failed');
    }
  }

  async function toggleSave() {
    if (!user || saveState === 'saving') {
      return;
    }

    setSaveState('saving');

    try {
      const result = await apiRequest<{ saved: boolean; saveCount: number }>(
        `/prompt-repositories/${encodeURIComponent(slug)}/save`,
        {
          accessToken: accessToken ?? undefined,
          method: repository?.isSaved ? 'DELETE' : 'POST',
        },
      );
      setRepository((current) =>
        current
          ? {
              ...current,
              isSaved: result.saved,
              saveCount: result.saveCount,
            }
          : current,
      );
      setSaveState('idle');
      if (result.saved) {
        trackAnalyticsEvent('prompt_saved', undefined, accessToken);
      }
    } catch {
      setSaveState('failed');
    }
  }

  async function toggleLike() {
    if (!user || likeState === 'liking') {
      return;
    }

    setLikeState('liking');

    try {
      const result = await apiRequest<{ liked: boolean; likeCount: number }>(
        `/prompt-repositories/${encodeURIComponent(slug)}/like`,
        {
          accessToken: accessToken ?? undefined,
          method: repository?.isLiked ? 'DELETE' : 'POST',
        },
      );
      setRepository((current) =>
        current
          ? {
              ...current,
              isLiked: result.liked,
              likeCount: result.likeCount,
            }
          : current,
      );
      setLikeState('idle');
      if (result.liked) {
        trackAnalyticsEvent('repository_liked', undefined, accessToken);
      }
    } catch {
      setLikeState('failed');
    }
  }

  return (
    <div className="grid gap-8">
      <Card className="relative overflow-hidden border-[#0D0D0D] bg-[#0D0D0D] text-white dark:border-white">
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full border-[40px] border-white/10" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge className="!border-white/30 !text-zinc-300">
                {repository.visibility.toLowerCase()}
              </Badge>
              {repository.category ? (
                <Badge className="!border-white/30 !text-zinc-300">
                  {repository.category.name}
                </Badge>
              ) : null}
              {repository.promptAudiences.length > 0 ? (
                <Badge className="!border-white/30 !text-zinc-300">
                  {repository.promptAudiences
                    .map(({ audience }) => audience.name)
                    .join(' · ')}
                </Badge>
              ) : null}
              {activeVersion ? (
                <Badge className="!border-white/30 !text-zinc-300">
                  {selectedVersion ? 'Earlier' : 'Current'} update{' '}
                  {activeVersion.versionNumber}
                </Badge>
              ) : null}
            </div>
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.07em] sm:text-7xl">
                {repository.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-300">
                {repository.description || 'A reusable prompt.'}
              </p>
            </div>
            <Link
              className="inline-flex items-center gap-3 text-sm text-zinc-300 hover:text-white"
              href={`/u/${repository.owner.username}`}
            >
              <Avatar
                avatar={getMediaUrl(repository.owner.profile?.avatar ?? null)}
                className="size-9 !border-white/30 !bg-white/10 !text-white"
                name={displayName}
              />
              <span>
                By <strong className="text-white">{displayName}</strong>{' '}
                <span className="font-mono">@{repository.owner.username}</span>
              </span>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <PromptShare repository={repository} />
            <Button
              disabled={!version || copyState === 'copying'}
              onClick={() => void copyPrompt()}
              type="button"
              variant="secondary"
            >
              {copyState === 'copying'
                ? 'Copying...'
                : copyState === 'copied'
                  ? 'Copied'
                  : 'Copy Prompt'}
            </Button>
            {user ? (
              <Button
                disabled={saveState === 'saving'}
                onClick={() => void toggleSave()}
                type="button"
                variant="secondary"
              >
                {saveState === 'saving'
                  ? 'Saving...'
                  : repository.isSaved
                    ? 'Saved'
                    : 'Save'}
              </Button>
            ) : (
              <Link
                className={getButtonClasses('secondary')}
                href={`/login?next=${encodeURIComponent(promptPath)}`}
              >
                Sign in to Save
              </Link>
            )}
            {user ? (
              <Button
                disabled={likeState === 'liking'}
                onClick={() => void toggleLike()}
                type="button"
                variant="secondary"
              >
                {likeState === 'liking'
                  ? 'Liking...'
                  : repository.isLiked
                    ? 'Liked'
                    : 'Like'}
              </Button>
            ) : (
              <Link
                className={getButtonClasses('secondary')}
                href={`/login?next=${encodeURIComponent(promptPath)}`}
              >
                Sign in to Like
              </Link>
            )}
            {user ? (
              <Link
                className={getButtonClasses('secondary')}
                href={`/create?variantFrom=${encodeURIComponent(slug)}`}
              >
                Create variation
              </Link>
            ) : (
              <Link
                className={getButtonClasses('secondary')}
                href={`/login?next=${encodeURIComponent(`/create?variantFrom=${slug}`)}`}
              >
                Sign in to Create
              </Link>
            )}
            <ReportRepositoryButton repositoryId={repository.id} />
          </div>
          <p className="relative mt-3 text-xs text-zinc-400">
            {copyState === 'failed'
              ? 'Could not copy the prompt. Please try again.'
              : `${repository.copyCount} copies - ${repository.saveCount} saves - ${repository.likeCount} likes`}
            {saveState === 'failed' ? ' Could not save; try again.' : ''}
            {likeState === 'failed' ? ' Could not like; try again.' : ''}
          </p>
          <p className="relative max-w-2xl text-xs leading-5 text-zinc-400">
            {user
              ? 'You are signed in. Save, like, discuss, follow creators, and publish your own prompts.'
              : 'Read and copy this prompt freely. Sign in to save, like, discuss, follow creators, or publish your own prompts.'}
          </p>
        </div>
      </Card>

      {repository.sourcePrompt ? (
        <Card className="border-dashed">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
            Attribution
          </p>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Based on{' '}
            <Link
              className="font-semibold text-black underline dark:text-white"
              href={`/u/${repository.sourcePrompt.owner.username}`}
            >
              @{repository.sourcePrompt.owner.username}
            </Link>{' '}
            /{' '}
            <Link
              className="font-semibold text-black underline dark:text-white"
              href={`/p/${repository.sourcePrompt.slug}`}
            >
              {repository.sourcePrompt.title}
            </Link>
          </p>
        </Card>
      ) : null}

      {repository.promptAudiences.length > 0 ||
      repository.promptTags.length > 0 ||
      repository.aiCompatibility ? (
        <Card className="grid gap-4">
          <h2 className="text-lg font-semibold">Prompt metadata</h2>
          {repository.category ? (
            <MetadataRow label="Category" value={repository.category.name} />
          ) : null}
          {repository.promptAudiences.length > 0 ? (
            <MetadataRow
              label="Audience"
              value={repository.promptAudiences
                .map(({ audience }) => audience.name)
                .join(' · ')}
            />
          ) : null}
          {repository.promptTags.length > 0 ? (
            <MetadataRow
              label="Topic tags"
              value={repository.promptTags
                .map(({ tag }) => tag.name)
                .join(' · ')}
            />
          ) : null}
          {repository.aiCompatibility ? (
            <MetadataRow
              label="AI compatibility"
              value={repository.aiCompatibility}
            />
          ) : null}
        </Card>
      ) : null}

      {user?.id === repository.ownerId ? (
        <PromptAudienceEditor
          accessToken={accessToken}
          initialAudienceIds={repository.promptAudiences.map(
            ({ audience }) => audience.id,
          )}
          onSaved={setRepository}
          repositorySlug={slug}
        />
      ) : null}

      <Tabs
        initialId={initialTab}
        items={[
          {
            content: <OverviewTab repository={repository} />,
            id: 'overview',
            label: 'Overview',
          },
          {
            content: (
              <PromptTab
                content={
                  activeVersion?.content ?? 'No prompt content is available.'
                }
                variables={activeVersion?.variables ?? []}
              />
            ),
            id: 'prompt',
            label: 'Prompt',
          },
          {
            content: (
              <VersionsTab
                currentVersion={version}
                onSelectVersion={setSelectedVersion}
                repositorySlug={slug}
              />
            ),
            id: 'versions',
            label: 'Updates',
          },
          {
            content: (
              <ExamplesTab
                evidenceImages={evidenceImages}
                examples={activeVersion?.examples ?? []}
                onSelectImage={setSelectedImage}
              />
            ),
            id: 'examples',
            label: 'Examples',
          },
          {
            content: <LineageTab repositorySlug={slug} />,
            id: 'variants',
            label: 'Variations',
          },
          {
            content: (
              <ActivityTab
                accessToken={accessToken}
                repositorySlug={slug}
                userId={user?.id}
              />
            ),
            id: 'activity',
            label: 'History',
          },
        ]}
      />

      {user?.id === repository.ownerId && version ? (
        <NewVersionForm
          accessToken={accessToken}
          initialContent={version.content}
          repositorySlug={slug}
        />
      ) : null}

      <Modal
        description={
          selectedImage?.caption || selectedImage?.altText || 'Result image'
        }
        onClose={() => setSelectedImage(undefined)}
        open={Boolean(selectedImage)}
        title={selectedImage?.originalFilename || 'Result image'}
      >
        {selectedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={selectedImage.altText || selectedImage.originalFilename}
            className="max-h-[70vh] w-full rounded-2xl object-contain"
            decoding="async"
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

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-zinc-200 pb-3 last:border-0 last:pb-0 dark:border-zinc-800 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function ActivityTab({
  accessToken,
  repositorySlug,
  userId,
}: {
  accessToken: string | null;
  repositorySlug: string;
  userId?: string;
}) {
  const [events, setEvents] = useState<RepositoryActivityResponse[]>([]);

  useEffect(() => {
    let active = true;
    void apiRequest<RepositoryActivityResponse[]>(
      `/prompt-repositories/${encodeURIComponent(repositorySlug)}/activity`,
    )
      .then((response) => {
        if (active) setEvents(response);
      })
      .catch(() => {
        if (active) setEvents([]);
      });
    return () => {
      active = false;
    };
  }, [repositorySlug]);

  return (
    <div className="grid gap-6">
      <Card>
        <div className="space-y-2">
          <Badge>Prompt history</Badge>
          <h2 className="text-2xl font-semibold">
            Useful changes, kept visible.
          </h2>
        </div>
        {events.length === 0 ? (
          <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">
            No history to show yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-3">
            {events.map((event) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                key={event.id}
              >
                <p className="text-sm">
                  <Link
                    className="font-mono font-semibold underline"
                    href={`/u/${event.actor.username}`}
                  >
                    @{event.actor.username}
                  </Link>{' '}
                  {activityLabel(event.type, event.metadata)}
                </p>
                <time
                  className="text-xs text-zinc-600 dark:text-zinc-400"
                  dateTime={event.createdAt}
                >
                  {formatDateTime(event.createdAt)}
                </time>
              </div>
            ))}
          </div>
        )}
      </Card>
      <CommentsSection
        accessToken={accessToken}
        repositorySlug={repositorySlug}
        userId={userId}
      />
    </div>
  );
}

function activityLabel(
  type: RepositoryActivityResponse['type'],
  metadata: Record<string, unknown> | null,
) {
  if (type === 'REPOSITORY_CREATED') return 'created this prompt.';
  if (type === 'VERSION_PUBLISHED') {
    const version =
      typeof metadata?.versionNumber === 'number'
        ? `Update ${metadata.versionNumber}`
        : 'a new update';
    return `published ${version}.`;
  }
  if (type === 'VARIANT_CREATED') return 'created a variation.';
  return 'created a public collection.';
}

function CommentsSection({
  accessToken,
  repositorySlug,
  userId,
}: {
  accessToken: string | null;
  repositorySlug: string;
  userId?: string;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void apiRequest<CommentsResponse>(
      `/prompt-repositories/${encodeURIComponent(repositorySlug)}/comments`,
    )
      .then((response) => {
        if (active) {
          setComments(response.items);
          setError(null);
        }
      })
      .catch(() => {
        if (active) {
          setError('Comments could not be loaded right now.');
        }
      });

    return () => {
      active = false;
    };
  }, [repositorySlug]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !content.trim() || saving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const comment = await apiRequest<CommentItem>(
        `/prompt-repositories/${encodeURIComponent(repositorySlug)}/comments`,
        {
          accessToken,
          body: JSON.stringify({
            content,
            ...(replyTo ? { parentId: replyTo } : {}),
          }),
          method: 'POST',
        },
      );
      setComments((current) =>
        replyTo
          ? current.map((item) =>
              item.id === replyTo
                ? { ...item, replies: [...item.replies, comment] }
                : item,
            )
          : [comment, ...current],
      );
      setContent('');
      setReplyTo(null);
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Comment could not be posted.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function update(commentId: string) {
    if (!accessToken || !editingContent.trim() || saving) {
      return;
    }

    setSaving(true);
    try {
      const updated = await apiRequest<CommentItem>(`/comments/${commentId}`, {
        accessToken,
        body: JSON.stringify({ content: editingContent }),
        method: 'PATCH',
      });
      setComments((current) => replaceComment(current, updated));
      setEditingId(null);
      setEditingContent('');
    } catch {
      setError('Comment could not be updated.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(commentId: string) {
    if (!accessToken || saving) {
      return;
    }

    setSaving(true);
    try {
      await apiRequest(`/comments/${commentId}`, {
        accessToken,
        method: 'DELETE',
      });
      setComments((current) => removeComment(current, commentId));
    } catch {
      setError('Comment could not be deleted.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="space-y-2">
        <Badge>Community activity</Badge>
        <h2 className="text-2xl font-semibold">Discuss this prompt.</h2>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Share helpful notes, ask questions, and help this prompt evolve.
        </p>
      </div>
      {userId ? (
        <form
          className="mt-5 grid gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <Textarea
            aria-label="Comment"
            maxLength={2000}
            onChange={(event) => setContent(event.target.value)}
            placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
            required
            value={content}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {replyTo
                ? 'Replying to a comment.'
                : 'Keep it useful and constructive.'}
            </p>
            <div className="flex gap-2">
              {replyTo ? (
                <Button onClick={() => setReplyTo(null)} variant="ghost">
                  Cancel reply
                </Button>
              ) : null}
              <Button disabled={saving} type="submit">
                {saving
                  ? 'Posting...'
                  : replyTo
                    ? 'Post reply'
                    : 'Post comment'}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            className="font-semibold underline"
            href={`/login?next=${encodeURIComponent(promptPathForSlug(repositorySlug))}`}
          >
            Sign in
          </Link>{' '}
          to join the discussion.
        </p>
      )}
      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="mt-7 grid gap-4">
        {comments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            No comments yet. Start the conversation.
          </p>
        ) : (
          comments.map((comment) => (
            <CommentCard
              comment={comment}
              editingContent={editingContent}
              editingId={editingId}
              key={comment.id}
              onCancelEdit={() => setEditingId(null)}
              onChangeEdit={setEditingContent}
              onDelete={(id) => void remove(id)}
              onEdit={(item) => {
                setEditingId(item.id);
                setEditingContent(item.content);
              }}
              onReply={setReplyTo}
              onSaveEdit={(id) => void update(id)}
              saving={saving}
              userId={userId}
            />
          ))
        )}
      </div>
    </Card>
  );
}

function CommentCard({
  comment,
  editingContent,
  editingId,
  onCancelEdit,
  onChangeEdit,
  onDelete,
  onEdit,
  onReply,
  onSaveEdit,
  saving,
  userId,
}: {
  comment: CommentItem;
  editingContent: string;
  editingId: string | null;
  onCancelEdit: () => void;
  onChangeEdit: (value: string) => void;
  onDelete: (id: string) => void;
  onEdit: (comment: CommentItem) => void;
  onReply: (id: string) => void;
  onSaveEdit: (id: string) => void;
  saving: boolean;
  userId?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="font-mono">@{comment.user.username}</span>
        <span>{formatDateTime(comment.createdAt)}</span>
      </div>
      {editingId === comment.id ? (
        <div className="mt-3 grid gap-3">
          <Textarea
            aria-label="Edit comment"
            maxLength={2000}
            onChange={(event) => onChangeEdit(event.target.value)}
            value={editingContent}
          />
          <div className="flex gap-2">
            <Button disabled={saving} onClick={() => onSaveEdit(comment.id)}>
              Save edit
            </Button>
            <Button onClick={onCancelEdit} variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-300">
          {comment.content}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
        {userId ? (
          <button
            className="underline underline-offset-4"
            onClick={() => onReply(comment.id)}
            type="button"
          >
            Reply
          </button>
        ) : null}
        {userId === comment.userId ? (
          <>
            <button
              className="underline underline-offset-4"
              onClick={() => onEdit(comment)}
              type="button"
            >
              Edit
            </button>
            <button
              className="text-red-600 underline underline-offset-4 dark:text-red-400"
              onClick={() => onDelete(comment.id)}
              type="button"
            >
              Delete
            </button>
          </>
        ) : null}
      </div>
      {comment.replies.length > 0 ? (
        <div className="mt-4 grid gap-3 border-l-2 border-zinc-200 pl-4 dark:border-zinc-800">
          {comment.replies.map((reply) => (
            <div key={reply.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-mono">@{reply.user.username}</span>
                <span>{formatDateTime(reply.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {reply.content}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function replaceComment(
  comments: CommentItem[],
  updated: CommentItem,
): CommentItem[] {
  return comments.map((comment) =>
    comment.id === updated.id
      ? updated
      : { ...comment, replies: replaceComment(comment.replies, updated) },
  );
}

function removeComment(comments: CommentItem[], commentId: string) {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({
      ...comment,
      replies: comment.replies.filter((reply) => reply.id !== commentId),
    }));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function PromptTab({
  content,
  variables,
}: {
  content: string;
  variables: PromptVersionContent['variables'];
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      variables.map((variable) => [variable.name, variable.defaultValue ?? '']),
    ),
  );
  const customized = variables.reduce((result, variable) => {
    const value = values[variable.name] || `[${variable.name}]`;
    return result
      .replaceAll(`{{${variable.name}}}`, value)
      .replaceAll(`{${variable.name}}`, value)
      .replaceAll(`[${variable.name}]`, value);
  }, content);

  async function copyCustomized() {
    await copyToClipboard(customized);
  }

  return (
    <div className="grid gap-4">
      {variables.length > 0 ? (
        <Card>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Customize this prompt</h2>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Fill in the variables, then copy your ready-to-use version.
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {variables.map((variable) => (
              <label
                className="grid gap-1.5 text-sm font-medium"
                key={variable.id}
              >
                {variable.name}
                <Input
                  aria-label={`Value for ${variable.name}`}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [variable.name]: event.target.value,
                    }))
                  }
                  placeholder={variable.description ?? variable.name}
                  value={values[variable.name] ?? ''}
                />
              </label>
            ))}
          </div>
          <Button
            className="mt-4"
            onClick={() => void copyCustomized()}
            type="button"
          >
            Copy customized prompt
          </Button>
        </Card>
      ) : null}
      <Card className="overflow-hidden bg-[#0D0D0D] p-0 text-white dark:border-white">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
            Current prompt
          </span>
          <span className="text-xs text-zinc-400">Preview</span>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap p-6 font-mono text-sm leading-8 text-zinc-200">
          {customized}
        </pre>
      </Card>
    </div>
  );
}

function VersionsTab({
  currentVersion,
  onSelectVersion,
  repositorySlug,
}: {
  currentVersion: PromptVersionContent | null;
  onSelectVersion: (version: PromptVersionDetail | undefined) => void;
  repositorySlug: string;
}) {
  const [versions, setVersions] = useState<PromptVersionSummary[]>([]);
  const [comparison, setComparison] = useState<PromptVersionDetail>();

  useEffect(() => {
    let active = true;
    void apiRequest<PromptVersionSummary[]>(
      `/prompt-repositories/${encodeURIComponent(repositorySlug)}/versions`,
    )
      .then((result) => {
        if (active) {
          setVersions(result);
        }
      })
      .catch(() => {
        if (active) {
          setVersions([]);
        }
      });

    return () => {
      active = false;
    };
  }, [repositorySlug]);

  async function selectVersion(versionNumber: number) {
    if (versionNumber === currentVersion?.versionNumber) {
      setComparison(undefined);
      onSelectVersion(undefined);
      return;
    }

    const version = await apiRequest<PromptVersionDetail>(
      `/prompt-repositories/${encodeURIComponent(repositorySlug)}/versions/${versionNumber}`,
    );
    setComparison(version);
    onSelectVersion(version);
  }

  return (
    <div className="grid gap-5">
      <Card>
        <div className="space-y-2">
          <Badge>Update history</Badge>
          <h2 className="mt-2 text-2xl font-semibold">
            Published updates stay clear and easy to compare.
          </h2>
        </div>
        <div className="mt-5 grid gap-2">
          {versions.map((version) => (
            <button
              className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 px-4 py-3 text-left transition hover:border-black dark:border-zinc-800 dark:hover:border-white"
              key={version.id}
              onClick={() => void selectVersion(version.versionNumber)}
              type="button"
            >
              <span>
                <strong>Update {version.versionNumber}</strong>
                <span className="ml-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {version.changelog || 'No update note'}
                </span>
              </span>
              <Badge>
                {version.versionNumber === currentVersion?.versionNumber
                  ? 'Current update'
                  : 'Earlier update'}
              </Badge>
            </button>
          ))}
        </div>
      </Card>
      {comparison && currentVersion ? (
        <Card>
          <div className="space-y-2">
            <Badge>Basic comparison</Badge>
            <h2 className="text-2xl font-semibold">
              Earlier update vs current update
            </h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <CodeBlock
              label={`Earlier update ${comparison.versionNumber}`}
              value={comparison.content}
            />
            <CodeBlock
              label={`Current update ${currentVersion.versionNumber}`}
              value={currentVersion.content}
            />
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function NewVersionForm({
  accessToken,
  initialContent,
  repositorySlug,
}: {
  accessToken: string | null;
  initialContent: string;
  repositorySlug: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [changelog, setChangelog] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiRequest(
        `/prompt-repositories/${encodeURIComponent(repositorySlug)}/versions`,
        {
          accessToken: accessToken ?? undefined,
          body: JSON.stringify({ changelog, content, publish: true }),
          method: 'POST',
        },
      );
      window.location.reload();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Update could not be created.',
      );
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="space-y-2">
        <Badge>Create an update</Badge>
        <h2 className="text-2xl font-semibold">Keep your prompt growing.</h2>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Published updates stay unchanged. Add a new update when you want to
          improve the prompt while keeping earlier results available.
        </p>
      </div>
      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => void submit(event)}
      >
        <Textarea
          aria-label="New prompt update"
          onChange={(event) => setContent(event.target.value)}
          required
          value={content}
        />
        <Input
          aria-label="Update note"
          maxLength={1000}
          onChange={(event) => setChangelog(event.target.value)}
          placeholder="What changed?"
          required
          value={changelog}
        />
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div className="flex justify-end">
          <Button disabled={saving} type="submit">
            {saving ? 'Publishing...' : 'Publish update'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ExamplesTab({
  evidenceImages,
  examples,
  onSelectImage,
}: {
  evidenceImages: PromptEvidenceImage[];
  examples: NonNullable<PromptRepositoryDetail['currentVersion']>['examples'];
  onSelectImage: (image: PromptEvidenceImage) => void;
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
            <Badge>Results</Badge>
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
                  decoding="async"
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
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Results can vary depending on the AI tool and settings you use.
      </p>
      {examples.length === 0 && evidenceImages.length === 0 ? (
        <EmptyState
          description="Add examples or results as this prompt grows."
          title="No examples yet"
        />
      ) : null}
    </div>
  );
}

function LineageTab({ repositorySlug }: { repositorySlug: string }) {
  const [lineage, setLineage] = useState<PromptLineageResponse | null>(null);

  useEffect(() => {
    let active = true;
    void apiRequest<PromptLineageResponse>(
      `/prompt-repositories/${encodeURIComponent(repositorySlug)}/lineage`,
    )
      .then((result) => {
        if (active) {
          setLineage(result);
        }
      })
      .catch(() => {
        if (active) {
          setLineage(null);
        }
      });

    return () => {
      active = false;
    };
  }, [repositorySlug]);

  if (!lineage) {
    return (
      <Card>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Loading prompt evolution...
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Badge>Prompt evolution</Badge>
          <h2 className="text-2xl font-semibold">
            Prompt evolution, kept readable.
          </h2>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {lineage.variantCount} direct variations
        </p>
      </div>
      {lineage.root ? (
        <div className="mt-6 grid gap-2">
          <LineageItem
            currentId={lineage.currentRepositoryId}
            node={lineage.root}
          />{' '}
        </div>
      ) : (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          No evolution history is available yet.
        </p>
      )}
    </Card>
  );
}

function LineageItem({
  currentId,
  depth = 0,
  node,
}: {
  currentId: string;
  depth?: number;
  node: PromptLineageNode;
}) {
  return (
    <div className="grid gap-2">
      <Link
        className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 px-4 py-3 transition hover:border-black dark:border-zinc-800 dark:hover:border-white"
        href={getPublicPromptPath(node.id, node.slug)}
        style={{ marginLeft: `${depth * 1.25}rem` }}
      >
        <span>
          <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
            {depth === 0 ? 'Original' : 'Variation'}
          </span>
          <strong className="ml-3">{node.title}</strong>
          <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">
            @{node.ownerUsername}
          </span>
        </span>
        {node.id === currentId ? <Badge>Current</Badge> : null}
      </Link>
      {node.children.map((child) => (
        <LineageItem
          currentId={currentId}
          depth={depth + 1}
          key={child.id}
          node={child}
        />
      ))}
    </div>
  );
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-900">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
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
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-400">
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

function promptPathForSlug(slug: string) {
  return `/p/${encodeURIComponent(slug)}`;
}
