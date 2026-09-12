/** @type {import('next').NextConfig} */
const apiInternalUrl = process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000';

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${apiInternalUrl}/api/v1/:path*` }];
  },
};
export default nextConfig;
