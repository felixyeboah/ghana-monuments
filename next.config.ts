import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /*
      Next's optimizer endpoint (/_next/image) has no implementation on
      Cloudflare Workers without a Cloudflare Images binding, so every
      gallery photograph came back empty in production. Unoptimized emits
      the source URL directly, which is what these already are: contributor
      photographs served from Wikimedia Commons.
    */
    unoptimized: true,
    // Kept as the record of where the photography comes from.
    // See scripts/fetch-monument-media.mjs for how the set is assembled.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
    ],
  },
};

export default nextConfig;
