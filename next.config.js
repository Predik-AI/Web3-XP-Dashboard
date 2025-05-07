// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    // Ensure API routes are included in the build
    experimental: {
      appDir: true,
    }
  }
  
  module.exports = nextConfig