import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@workspace/shared"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
