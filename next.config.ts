import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Contributor photography served straight from Wikimedia Commons.
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
