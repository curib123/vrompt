export const publicPrimaryRoutes = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/explore', label: 'Explore' },
] as const;

export const memberPrimaryRoutes = [
  { href: '/create', label: 'Create' },
  { href: '/saved', label: 'Saved' },
  { href: '/collections', label: 'Collections' },
  { href: '/following', label: 'Following' },
] as const;

export const primaryRoutes = [
  ...publicPrimaryRoutes,
  ...memberPrimaryRoutes,
] as const;

export const secondaryRoutes = [
  { href: '/notifications', label: 'Notifications' },
  { href: '/settings', label: 'Settings' },
  { href: '/login', label: 'Login' },
  { href: '/register', label: 'Register' },
] as const;
