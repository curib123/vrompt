import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir:
    process.env.NEXT_DIST_DIR ??
    (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  typedRoutes: true,
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
