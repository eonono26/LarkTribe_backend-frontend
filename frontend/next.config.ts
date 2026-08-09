import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Disable the Next.js image optimizer
    unoptimized: true,

    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
    ],

    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;