export const publicPrimaryRoutes = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/generate', label: 'Generate', icon: 'sparkles' },
  { href: '/search', label: 'Search', icon: 'search' },
  { href: '/explore', label: 'Explore', icon: 'explore' },
  { href: '/pricing', label: 'Pro', icon: 'sparkles' },
] as const;

export const memberPrimaryRoutes = [
  { href: '/dashboard', label: 'Today', icon: 'home' },
  { href: '/generate', label: 'Generate', icon: 'sparkles' },
  { href: '/search', label: 'Search', icon: 'search' },
  { href: '/explore', label: 'Explore', icon: 'explore' },
  { href: '/create', label: 'Prompts', icon: 'create' },
  { href: '/pricing', label: 'Pro', icon: 'sparkles' },
] as const;

export const primaryRoutes = memberPrimaryRoutes;

export const secondaryRoutes = [
  { href: '/notifications', label: 'Notifications' },
  { href: '/login', label: 'Login' },
] as const;
