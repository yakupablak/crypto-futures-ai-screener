import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function createNextConfig(phase: string): NextConfig {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    // Keep the dev server in an isolated output directory so background
    // `next build` / `next typegen` runs cannot invalidate the running app.
    distDir: isDevServer ? ".next-dev" : ".next",
    transpilePackages: ["@crypto-futures/shared", "@crypto-futures/analysis-core"],
    experimental: {
      externalDir: true,
    },
  };
}
