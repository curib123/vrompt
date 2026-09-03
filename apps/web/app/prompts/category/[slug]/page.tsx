import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TaxonomyLandingPage } from '@/components/seo/taxonomy-landing-page';
import {
  fetchCategory,
  fetchSearchData,
  fetchSeoLandingPages,
} from '@/lib/api';
import { categoryLanding } from '@/lib/seo-landing-content';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

async function getPage(slug: string) {
  const [category, index] = await Promise.all([
    fetchCategory(slug),
    fetchSeoLandingPages(),
  ]);
  const entry = index?.categories.find((item) => item.slug === slug);
  if (
    !category ||
    !entry ||
    entry.promptCount < (index?.minimumPromptCount ?? 3)
  )
    notFound();
  const result = await fetchSearchData(
    new URLSearchParams({ category: slug, page: '1' }),
  );
  return { landing: categoryLanding(category.name, category.slug), result };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { landing } = await getPage(slug);
  return createPageMetadata({
    title: landing.title,
    description: landing.description,
    path: `/prompts/category/${landing.slug}`,
  });
}

export default async function CategoryPromptPage({ params }: Props) {
  const { slug } = await params;
  const { landing, result } = await getPage(slug);
  return <TaxonomyLandingPage landing={landing} result={result} />;
}
