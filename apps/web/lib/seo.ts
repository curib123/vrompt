import type { Metadata } from 'next';

const fallbackSiteUrl = 'http://localhost:3000';
const primaryTagline =
  'Vrompt — Generate, Discover, and Improve AI Prompts That Work';

export const siteConfig = {
  name: 'Vrompt',
  tagline: primaryTagline,
  defaultTitle: primaryTagline,
  description:
    'Generate structured, effective AI prompts from your goals, explore proven community prompts, and save, improve, or share what works.',
  shortDescription:
    'Vrompt helps people generate structured AI prompts, discover proven ideas, and save, improve, and share what works.',
} as const;

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.WEB_ORIGIN?.trim() ||
    fallbackSiteUrl;

  try {
    const url = new URL(configuredUrl);
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return new URL(fallbackSiteUrl);
  }
}

export function absoluteUrl(path = '/') {
  return new URL(path, getSiteUrl()).toString();
}

export function truncateSeoText(value: string, maximum = 160) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maximum) return normalized;
  return `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

export type BreadcrumbItem = {
  name: string;
  path?: string;
};

export function createBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export function createPageMetadata({
  absoluteTitle = false,
  title,
  description,
  imagePath = '/opengraph-image',
  path,
  index = true,
  follow = index,
}: {
  absoluteTitle?: boolean;
  title: string;
  description: string;
  imagePath?: string;
  path: string;
  index?: boolean;
  follow?: boolean;
}): Metadata {
  const conciseTitle = truncateSeoText(
    title,
    title === siteConfig.tagline ? 80 : 60,
  );
  const conciseDescription = truncateSeoText(description);

  return {
    title: absoluteTitle ? { absolute: conciseTitle } : conciseTitle,
    description: conciseDescription,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: siteConfig.name,
      title: conciseTitle,
      description: conciseDescription,
      url: path,
      images: [
        {
          url: imagePath,
          width: 1200,
          height: 630,
          alt: siteConfig.tagline,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: conciseTitle,
      description: conciseDescription,
      images: [imagePath],
    },
    robots: index
      ? {
          index: true,
          follow,
          googleBot: {
            index: true,
            follow,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        }
      : {
          index: false,
          follow,
          googleBot: { index: false, follow },
        },
  };
}

export function createPrivatePageMetadata(
  title: string,
  description: string,
): Metadata {
  const metadata = createPageMetadata({
    title,
    description,
    path: '/',
    index: false,
  });

  return {
    title: metadata.title,
    description: metadata.description,
    robots: metadata.robots,
  };
}
