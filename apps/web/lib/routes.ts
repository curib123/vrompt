export const publicPrimaryRoutes = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/explore', label: 'Explore' },
] as const;

export const memberPrimaryRoutes = [
  { href: '/search', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/create', label: 'Prompts' },
] as const;

export const primaryRoutes = memberPrimaryRoutes;

export const secondaryRoutes = [
  { href: '/notifications', label: 'Notifications' },
  { href: '/login', label: 'Login' },
] as const;
