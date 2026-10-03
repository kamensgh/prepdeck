import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Multi-threaded WASM needs SharedArrayBuffer, which needs cross-origin isolation.
  // Site-wide on purpose: headers only apply on a full page load, and the practice
  // route is usually reached by client-side navigation.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

export default nextConfig;
