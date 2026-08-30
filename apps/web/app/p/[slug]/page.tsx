import { RoutePlaceholder } from '@/components/route-placeholder';

export default async function PromptPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  return (
    <RoutePlaceholder
      description={`Repository detail pages will be polished in a later phase. The route and shell are already reserved for ${slug}.`}
      eyebrow="Repository"
      title={slug}
    />
  );
}
