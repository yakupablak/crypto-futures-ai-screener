import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@crypto-futures/shared", "@crypto-futures/analysis-core"],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
