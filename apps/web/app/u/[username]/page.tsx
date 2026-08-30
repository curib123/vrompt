import type { Metadata } from 'next';

import { ProfileView } from '@/components/profile/profile-view';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, createPageMetadata } from '@/lib/seo';
import { getProfileSeoData } from '@/lib/seo-data';

type ProfilePageProps = Readonly<{
  params: Promise<{ username: string }>;
}>;

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileSeoData(username);
  const displayName = profile?.displayName || profile?.username || username;

  return createPageMetadata({
    title: profile ? `${displayName} (@${profile.username})` : 'Creator unavailable',
    description:
      profile?.bio ||
      `Explore AI prompts and public collections shared by ${displayName} on Vrompt.`,
    path: `/u/${encodeURIComponent(username)}`,
    index: Boolean(profile),
  });
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getProfileSeoData(username);
  const displayName = profile?.displayName || profile?.username || username;

  return (
    <>
      {profile ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Person',
            '@id': absoluteUrl(`/u/${encodeURIComponent(username)}#person`),
            name: displayName,
            alternateName: `@${profile.username}`,
            description: profile.bio || undefined,
            url: absoluteUrl(`/u/${encodeURIComponent(username)}`),
            image: profile.avatar?.startsWith('http')
              ? profile.avatar
              : undefined,
            sameAs: profile.website ? [profile.website] : undefined,
          }}
        />
      ) : null}
      <ProfileView initialProfile={profile} username={username} />
    </>
  );
}
