export const publicPrimaryRoutes = [
  { href: '/search', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/landing', label: 'Landing' },
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
  { href: '/register', label: 'Register' },
] as const;
