/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@portfolio-immortalized/domain',
    '@portfolio-immortalized/validation',
    '@portfolio-immortalized/api-client',
    '@portfolio-immortalized/server',
  ],
};

module.exports = nextConfig;
