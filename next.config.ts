import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/chat": ["skills/*/SKILL.md"],
  },
};

export default nextConfig;
