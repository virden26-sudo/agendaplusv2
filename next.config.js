/** @type {import('next').NextConfig} */
const nextConfig = {
  // If you are using a custom domain/CDN, it MUST have http:// or https://
  // If you are just running locally, it's safest to leave this as undefined or '/'
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://your-cdn.com' : undefined,
  
  // Ensure your fonts and static assets are handled correctly
  images: {
    unoptimized: true, // Often helps with memory issues during dev
  },
};

export default nextConfig;