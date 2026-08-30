import type { MetadataRoute } from 'next';

import { absoluteUrl, getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/auth/',
        '/create',
        '/following',
        '/login',
        '/notifications',
        '/register',
        '/saved',
        '/settings',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: getSiteUrl().origin,
  };
}
