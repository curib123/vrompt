import type { Metadata } from 'next';

import { ProfileView } from '@/components/profile/profile-view';
import { JsonLd } from '@/components/seo/json-ld';
import {
  absoluteUrl,
  createBreadcrumbList,
  createPageMetadata,
} from '@/lib/seo';
import { getProfileSeoData } from '@/lib/seo-data';

type ProfilePageProps = Readonly<{
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}>;

export async function generateMetadata({
  params,
  searchParams,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const { tab } = await searchParams;
  const profile = await getProfileSeoData(username);
  const displayName = profile?.displayName || profile?.username || username;
  const publicPath = profile
    ? `/u/${encodeURIComponent(profile.username)}`
    : `/u/${encodeURIComponent(username)}`;
  const hasPublicContent = Boolean(
    profile?.repositories.length ||
    profile?.collections.some((collection) => collection._count.items > 0),
  );

  return createPageMetadata({
    title: profile
      ? `${displayName} (@${profile.username})`
      : 'Creator unavailable',
    description:
      profile?.bio ||
      `Explore AI prompts and public collections shared by ${displayName} on Vrompt.`,
    path: publicPath,
    index: Boolean(profile) && hasPublicContent && !tab,
  });
}

export default async function ProfilePage({
  params,
  searchParams,
}: ProfilePageProps) {
  const { username } = await params;
  const { tab } = await searchParams;
  const profile = await getProfileSeoData(username);
  const displayName = profile?.displayName || profile?.username || username;

  return (
    <>
      <JsonLd
        data={createBreadcrumbList([
          { name: 'Home', path: '/' },
          { name: 'Explore prompts', path: '/explore' },
          { name: displayName },
        ])}
      />
      {profile ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Person',
            '@id': absoluteUrl(
              `/u/${encodeURIComponent(profile.username)}#person`,
            ),
            name: displayName,
            alternateName: `@${profile.username}`,
            description: profile.bio || undefined,
            url: absoluteUrl(`/u/${encodeURIComponent(profile.username)}`),
            image: profile.avatar?.startsWith('http')
              ? profile.avatar
              : undefined,
            sameAs: profile.website ? [profile.website] : undefined,
          }}
        />
      ) : null}
      <ProfileView
        initialProfile={profile}
        initialTab={tab}
        username={username}
      />
    </>
  );
}
