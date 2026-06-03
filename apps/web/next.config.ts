import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship raw TypeScript; let Next transpile them.
  transpilePackages: ["@mockmate/db"],
};

export default nextConfig;
