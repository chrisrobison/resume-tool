/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Output standalone for Docker deployment
  output: 'standalone',

  // Environment variables exposed to browser
  env: {
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },

  // Image optimization
  images: {
    domains: ['localhost'],
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/signup',
        destination: '/pricing',
        permanent: false,
      },
    ];
  },
}

module.exports = nextConfig;
