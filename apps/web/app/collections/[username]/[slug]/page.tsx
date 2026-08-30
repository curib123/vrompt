import { CollectionDetailView } from '@/components/collections/collection-detail';

export default async function CollectionPage({
  params,
}: Readonly<{ params: Promise<{ username: string; slug: string }> }>) {
  const { slug, username } = await params;
  return <CollectionDetailView slug={slug} username={username} />;
}
