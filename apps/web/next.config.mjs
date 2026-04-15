/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@cookunity-seo-agent/core",
    "@cookunity-seo-agent/shared",
    "@cookunity-seo-agent/prompts",
    "@cookunity-seo-agent/integrations",
    "@cookunity-seo-agent/db",
  ],
  outputFileTracingIncludes: {
    "/*": ["../../packages/prompts/brand/**/*"],
    "/agents": ["../../packages/prompts/brand/**/*"],
    "/grid": ["../../packages/prompts/brand/**/*"],
    "/review": ["../../packages/prompts/brand/**/*"],
    "/api/agents/[agentName]/rerun": ["../../packages/prompts/brand/**/*"],
    "/api/grid/rows": ["../../packages/prompts/brand/**/*"],
    "/api/workflow/run": ["../../packages/prompts/brand/**/*"],
  },
};

export default nextConfig;
