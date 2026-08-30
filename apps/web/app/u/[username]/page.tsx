import { ProfileView } from '@/components/profile/profile-view';

export default async function ProfilePage({
  params,
}: Readonly<{
  params: Promise<{ username: string }>;
}>) {
  const { username } = await params;

  return <ProfileView username={username} />;
}
