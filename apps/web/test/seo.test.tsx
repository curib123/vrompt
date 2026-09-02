import {
  createPageMetadata,
  createPrivatePageMetadata,
  siteConfig,
  truncateSeoText,
} from '@/lib/seo';

describe('SEO metadata helpers', () => {
  it('normalizes long text and builds canonical public metadata', () => {
    const truncated = truncateSeoText(`  ${'useful '.repeat(30)}  `, 40);
    expect(truncated).toHaveLength(40);
    expect(truncated.endsWith('…')).toBe(true);

    const metadata = createPageMetadata({
      title: 'Explore prompts',
      description: 'Find useful AI prompts.',
      path: '/explore',
    });

    expect(metadata.alternates).toEqual({ canonical: '/explore' });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({
      title: 'Explore prompts',
      url: '/explore',
    });
  });

  it('keeps private pages out of search and social previews', () => {
    const metadata = createPrivatePageMetadata(
      'Account settings',
      'Manage your account.',
    );

    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.openGraph).toBeUndefined();
  });

  it('keeps the Home search page crawlable without indexing results', () => {
    const metadata = createPageMetadata({
      title: 'Prompt search',
      description: 'Find useful prompts from real creators.',
      path: '/search',
      index: false,
      follow: true,
    });

    expect(metadata.alternates).toEqual({ canonical: '/search' });
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
    expect(metadata.openGraph).toMatchObject({ url: '/search' });
  });

  it('keeps the primary brand tagline intact in public metadata', () => {
    const metadata = createPageMetadata({
      title: siteConfig.tagline,
      description: siteConfig.description,
      path: '/',
    });

    expect(metadata.title).toBe(siteConfig.tagline);
    expect(metadata.openGraph).toMatchObject({
      title: siteConfig.tagline,
      description: siteConfig.description,
    });
  });
});
