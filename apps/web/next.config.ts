import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir:
    process.env.NEXT_DIST_DIR ??
    (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  typedRoutes: false,
  async rewrites() {
    const api = (
      process.env.INTERNAL_API_BASE_URL ?? 'http://localhost:4000/api/v1'
    ).replace(/\/$/, '');
    return [{ source: '/api/v1/:path*', destination: `${api}/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/landing',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
