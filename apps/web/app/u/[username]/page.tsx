import { RoutePlaceholder } from '@/components/route-placeholder';

export default async function ProfilePage({
  params,
}: Readonly<{
  params: Promise<{ username: string }>;
}>) {
  const { username } = await params;

  return (
    <RoutePlaceholder
      description={`Public creator profiles will live here later. This placeholder keeps the canonical user route in place for @${username}.`}
      eyebrow="Profile"
      title={`@${username}`}
    />
  );
}
