/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NODE_ENV === 'production' || process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  transpilePackages: [
    '@portfolio-immortalized/domain',
    '@portfolio-immortalized/validation',
    '@portfolio-immortalized/api-client',
    '@portfolio-immortalized/server',
  ],
};

module.exports = nextConfig;
