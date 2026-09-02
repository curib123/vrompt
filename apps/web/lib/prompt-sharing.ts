export type PromptShareMetadata = {
  aiCompatibility?: string | null;
  description?: string | null;
  ownerUsername: string;
  sourcePromptTitle?: string | null;
  title: string;
  url: string;
};

export type SharePlatform =
  'facebook' | 'x' | 'linkedin' | 'reddit' | 'email' | 'whatsapp' | 'telegram';

export function getPublicPromptPath(id: string, slug: string) {
  return `/prompts/${encodeURIComponent(id)}/${encodeURIComponent(slug)}` as Route;
}

export function buildPublicPromptUrl(id: string, slug: string, origin: string) {
  const siteUrl = new URL(origin);
  if (!isPublicWebHostname(siteUrl.hostname)) {
    throw new Error('A public site URL is required for prompt sharing');
  }
  return new URL(getPublicPromptPath(id, slug), siteUrl).toString();
}

export function isPublicWebHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return !(
    normalized === 'localhost' ||
    normalized === '0.0.0.0' ||
    normalized === '::1' ||
    normalized === '127.0.0.1' ||
    normalized.endsWith('.localhost')
  );
}

export function buildPromptPostTemplate(metadata: PromptShareMetadata) {
  const summary = cleanSummary(metadata.description);
  return [
    `${metadata.title} — by @${metadata.ownerUsername}`,
    summary,
    metadata.aiCompatibility ? `Works with: ${metadata.aiCompatibility}` : null,
    `View on Vrompt: ${metadata.url}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildVariantPostTemplate(metadata: PromptShareMetadata) {
  return [
    metadata.sourcePromptTitle
      ? `${metadata.title} — a Variant based on ${metadata.sourcePromptTitle}`
      : `${metadata.title} — a Variant on Vrompt`,
    `Created by @${metadata.ownerUsername}`,
    metadata.url,
  ].join('\n');
}

export function buildVersionPostTemplate({
  changeSummary,
  title,
  url,
  version,
}: {
  changeSummary?: string | null;
  title: string;
  url: string;
  version: number;
}) {
  return [
    `${title} just got an update.`,
    changeSummary
      ? `Version ${version}: ${cleanSummary(changeSummary, 180)}`
      : `Version ${version}`,
    url,
  ].join('\n');
}

export function getSocialShareLinks(
  metadata: PromptShareMetadata,
): Array<{ href: string; label: string; platform: SharePlatform }> {
  const text = buildPromptPostTemplate(metadata);
  const subject = `${metadata.title} | Vrompt`;
  return [
    {
      platform: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(metadata.url)}`,
    },
    {
      platform: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
    },
    {
      platform: 'linkedin',
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(metadata.url)}`,
    },
    {
      platform: 'reddit',
      label: 'Reddit',
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(metadata.url)}&title=${encodeURIComponent(subject)}`,
    },
    {
      platform: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
    },
    {
      platform: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(text)}`,
    },
    {
      platform: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(metadata.url)}&text=${encodeURIComponent(text)}`,
    },
  ];
}

function cleanSummary(value?: string | null, maximum = 220) {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, maximum) : null;
}
import type { Route } from 'next';
