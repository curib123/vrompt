'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { FollowingFeed } from '@/components/activity/following-feed';
import { SavedRepositories } from '@/components/bookmarks/saved-repositories';
import { CollectionsView } from '@/components/collections/collections-view';
import { ProfileSettingsForm } from '@/components/profile/profile-settings-form';
import { PromptPreviewCard } from '@/components/prompts/prompt-preview';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { apiRequest, getMediaUrl } from '@/lib/api';
import type { ApiError, ProfileResponse } from '@/lib/api';

export function ProfileView({
  username,
  initialProfile = null,
  initialTab,
}: {
  username: string;
  initialProfile?: ProfileResponse | null;
  initialTab?: string;
}) {
  const router = useRouter();
  const { accessToken, isLoading, user } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(
    initialProfile,
  );
  const [error, setError] = useState<string | null>(null);
  const [followState, setFollowState] = useState<'idle' | 'saving' | 'failed'>(
    'idle',
  );

  useEffect(() => {
    let active = true;

    void apiRequest<ProfileResponse>(
      `/profiles/${encodeURIComponent(username)}`,
      { accessToken: accessToken ?? undefined },
    )
      .then((result) => {
        if (active) {
          setProfile(result);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            (requestError as ApiError).status === 404
              ? 'This profile does not exist or is no longer available.'
              : 'We could not load this profile right now.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken, isLoading, username]);

  if (error) {
    return (
      <EmptyState
        actionHref="/explore"
        actionLabel="Explore prompts"
        description={error}
        title="Profile unavailable"
      />
    );
  }

  if (!profile) {
    return <ProfileSkeleton />;
  }

  const displayName = profile.displayName || profile.username;
  const profileUsername = profile.username;
  const profileIsFollowing = profile.isFollowing;
  const isOwnProfile = user?.username === profile.username;

  async function toggleFollow() {
    if (!accessToken || followState === 'saving') {
      return;
    }

    setFollowState('saving');
    try {
      const result = await apiRequest<{
        following: boolean;
        followerCount: number;
      }>(`/profiles/${encodeURIComponent(profileUsername)}/follow`, {
        accessToken,
        method: profileIsFollowing ? 'DELETE' : 'POST',
      });
      setProfile((current) =>
        current
          ? {
              ...current,
              isFollowing: result.following,
              stats: { ...current.stats, followers: result.followerCount },
            }
          : current,
      );
      setFollowState('idle');
    } catch {
      setFollowState('failed');
    }
  }

  return (
    <div className="grid gap-8">
      <Card className="relative overflow-hidden border-[#0D0D0D] bg-[#0D0D0D] !text-white dark:border-white">
        <div className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full border-[38px] border-white/10" />
        <div className="relative flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-5">
            <Avatar
              avatar={getMediaUrl(profile.avatar)}
              className="size-20 !border-white/30 !bg-white/10 !text-white sm:size-24"
              name={displayName}
            />
            <div className="space-y-3">
              <Badge className="!border-white/30 !text-zinc-300">
                {isOwnProfile
                  ? 'Your profile workspace'
                  : profile.accountType === 'REAL'
                    ? 'Creator profile'
                    : `${profile.accountType.toLowerCase()} profile`}
              </Badge>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.06em] !text-white sm:text-5xl">
                  {displayName}
                </h1>
                <p className="mt-2 font-mono text-sm !text-zinc-300">
                  @{profile.username}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm !text-zinc-300">
            <span>Joined {formatDate(profile.createdAt)}</span>
            {profile.website ? (
              <a
                className="underline underline-offset-4 hover:!text-white"
                href={profile.website}
                rel="noreferrer"
                target="_blank"
              >
                Website
              </a>
            ) : null}
            {user && user.username !== profile.username ? (
              <Button
                disabled={followState === 'saving'}
                onClick={() => void toggleFollow()}
                variant="secondary"
              >
                {followState === 'saving'
                  ? 'Updating...'
                  : profile.isFollowing
                    ? 'Following'
                    : 'Follow'}
              </Button>
            ) : null}
          </div>
        </div>
        {followState === 'failed' ? (
          <p className="relative mt-4 text-sm text-red-300">
            Follow status could not be updated. Try again.
          </p>
        ) : null}
        {profile.bio ? (
          <p className="relative mt-8 max-w-2xl text-base leading-8 !text-zinc-200">
            {profile.bio}
          </p>
        ) : (
          <p className="relative mt-8 text-sm !text-zinc-400">
            No bio added yet.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <StatCard label="Prompts" value={profile.stats.repositories} />
        <StatCard label="Followers" value={profile.stats.followers} />
        <StatCard label="Following" value={profile.stats.following} />
      </div>

      {isOwnProfile ? (
        <Tabs
          ariaLabel="Profile workspace"
          initialId={initialTab}
          items={[
            {
              id: 'overview',
              label: 'Overview',
              content: <ProfileOverview profile={profile} />,
            },
            {
              id: 'saved',
              label: 'Saved',
              content: <SavedRepositories embedded />,
            },
            {
              id: 'collections',
              label: 'Collections',
              content: <CollectionsView embedded />,
            },
            {
              id: 'following',
              label: 'Following',
              content: <FollowingFeed embedded />,
            },
            {
              id: 'settings',
              label: 'Profile settings',
              content: <ProfileSettingsForm embedded />,
            },
          ]}
          onChange={(tab) =>
            router.replace(`/u/${profile.username}?tab=${tab}`, {
              scroll: false,
            })
          }
        />
      ) : (
        <ProfileOverview profile={profile} />
      )}
    </div>
  );
}

function ProfileOverview({ profile }: { profile: ProfileResponse }) {
  return (
    <div className="grid gap-8 pt-2">
      <ContentSection
        description="Public prompts shared by this creator."
        title="Public prompts"
      >
        {profile.repositories.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {profile.repositories.map((repository) => (
              <PromptPreviewCard
                className="h-full"
                description={repository.description}
                key={repository.id}
                slug={repository.slug}
                title={repository.title}
              >
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
                  Updated {formatDate(repository.updatedAt)}
                </p>
                <h3 className="mt-4 text-xl font-semibold tracking-tight">
                  {repository.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {repository.description || 'A public prompt.'}
                </p>
              </PromptPreviewCard>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Public prompts will appear here when this creator shares one."
            title="No public prompts yet"
          />
        )}
      </ContentSection>
      <ContentSection
        description="Curated public collections from this creator."
        title="Public collections"
      >
        {profile.collections.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {profile.collections.map((collection) => (
              <Link
                href={
                  `/collections/${profile.username}/${collection.slug}` as Route
                }
                key={collection.id}
              >
                <Card>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {collection.name}
                    </h3>
                    <Badge>{collection._count.items} prompts</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {collection.description || 'A public prompt collection.'}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Public collections will appear here when this creator publishes one."
            title="No public collections yet"
          />
        )}
      </ContentSection>
    </div>
  );
}

function ContentSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="grid gap-5">
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-600 dark:text-zinc-400">
          Profile shelf
        </p>
        <h2 className="text-3xl font-semibold tracking-[-0.05em]">{title}</h2>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="space-y-2 p-4 sm:p-6">
      <p className="text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">
        {value}
      </p>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-400">
        {label}
      </p>
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-8">
      <Skeleton className="h-72 rounded-[1.5rem]" />
      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-56 rounded-[1.5rem]" />
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
