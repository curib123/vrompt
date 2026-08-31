import type { Metadata } from 'next';

const fallbackSiteUrl = 'http://localhost:3000';

export const siteConfig = {
  name: 'Vrompt',
  defaultTitle: 'Vrompt — High-Quality AI Prompts',
  description:
    'Discover, copy, and improve high-quality AI prompts shared by prompt engineers, creators, and experienced AI users.',
  shortDescription: 'A living library of high-quality AI prompts.',
} as const;

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.WEB_ORIGIN ??
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

export function createPageMetadata({
  title,
  description,
  path,
  index = true,
  follow = index,
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  follow?: boolean;
}): Metadata {
  const conciseTitle = truncateSeoText(title, 60);
  const conciseDescription = truncateSeoText(description);

  return {
    title: conciseTitle,
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
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: 'Vrompt — high-quality AI prompts from real creators',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: conciseTitle,
      description: conciseDescription,
      images: ['/opengraph-image'],
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
