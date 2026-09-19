import type { NextConfig } from 'next';
import { resolve } from 'node:path';
const config: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: resolve('../..') },
  async rewrites() {
    return [{ source: '/v1/:path*', destination: 'http://127.0.0.1:4311/v1/:path*' }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default config;
