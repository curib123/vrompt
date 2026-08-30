export const primaryRoutes = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/search', label: 'Search' },
  { href: '/create', label: 'Create' },
  { href: '/saved', label: 'Saved' },
  { href: '/collections', label: 'Collections' },
  { href: '/following', label: 'Following' },
] as const;

export const secondaryRoutes = [
  { href: '/notifications', label: 'Notifications' },
  { href: '/settings', label: 'Settings' },
  { href: '/login', label: 'Login' },
  { href: '/register', label: 'Register' },
] as const;
