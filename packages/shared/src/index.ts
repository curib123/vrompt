import type { PlaceholderRoute } from '@vrompt/types';

export const APP_NAME = 'Vrompt';
export const API_PREFIX = '/api/v1';

export const PRIMARY_NAV_ROUTES: Array<{
  href: PlaceholderRoute;
  label: string;
}> = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/search', label: 'Search' },
  { href: '/create', label: 'Create' },
  { href: '/saved', label: 'Saved' },
  { href: '/collections', label: 'Collections' },
];

export function createHealthStamp(service: 'web' | 'api') {
  return {
    status: 'ok' as const,
    service,
    timestamp: new Date().toISOString(),
  };
}
