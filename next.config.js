/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // ** matches any subdomain (your Supabase project ref). Per Next.js
        // remotePatterns syntax, a single "*" only matches one path segment
        // and would NOT correctly match "<ref>.supabase.co" — "**" is required.
        hostname: "**.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
