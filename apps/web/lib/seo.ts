import type { Metadata } from 'next';

const fallbackSiteUrl = 'http://localhost:3000';

export const siteConfig = {
  name: 'Vrompt',
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
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
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
    },
    twitter: {
      card: 'summary_large_image',
      title: conciseTitle,
      description: conciseDescription,
    },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        }
      : {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
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
