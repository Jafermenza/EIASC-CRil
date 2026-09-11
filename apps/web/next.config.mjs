/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: 'http://localhost:4000/api/v1/:path*' }];
  },
};
export default nextConfig;
