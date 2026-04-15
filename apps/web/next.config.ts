import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@cookunity-seo-agent/core",
    "@cookunity-seo-agent/shared",
    "@cookunity-seo-agent/prompts",
    "@cookunity-seo-agent/integrations",
    "@cookunity-seo-agent/db",
  ],
};

export default nextConfig;
