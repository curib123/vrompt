import {
  createBreadcrumbList,
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
    expect(metadata.twitter).toMatchObject({
      images: ['/opengraph-image'],
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

  it('creates absolute breadcrumb schema for public content', () => {
    const breadcrumbs = createBreadcrumbList([
      { name: 'Home', path: '/' },
      { name: 'Explore prompts', path: '/explore' },
      { name: 'Writing prompt' },
    ]);

    expect(breadcrumbs).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, item: expect.stringContaining('/') },
        { position: 2, item: expect.stringContaining('/explore') },
        { position: 3, name: 'Writing prompt' },
      ],
    });
    expect(breadcrumbs.itemListElement[2]).not.toHaveProperty('item');
  });

  it('normalizes the configured public origin for proxy deployments', () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/vrompt/?preview=1';

    expect(
      createPageMetadata({
        title: 'Explore prompts',
        description: 'Find useful AI prompts.',
        path: '/explore',
      }).openGraph,
    ).toMatchObject({
      url: '/explore',
    });

    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  });
});
