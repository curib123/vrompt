import {
  createPageMetadata,
  createPrivatePageMetadata,
  truncateSeoText,
} from '@/lib/seo';

describe('SEO metadata helpers', () => {
  it('normalizes long text and builds canonical public metadata', () => {
    expect(truncateSeoText(`  ${'useful '.repeat(30)}  `, 40)).toHaveLength(40);

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
});
