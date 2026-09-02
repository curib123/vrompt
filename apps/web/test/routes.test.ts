import { memberPrimaryRoutes, publicPrimaryRoutes } from '@/lib/routes';

describe('navigation routes', () => {
  it('shows Search explicitly in authenticated navigation', () => {
    expect(memberPrimaryRoutes).toContainEqual({
      href: '/search',
      label: 'Search',
      icon: 'search',
    });
    expect(memberPrimaryRoutes.map(({ label }) => label)).not.toContain('Home');
  });

  it('keeps the public landing page in signed-out navigation', () => {
    expect(publicPrimaryRoutes).toContainEqual({
      href: '/',
      label: 'Home',
      icon: 'home',
    });
  });
});
