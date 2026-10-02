import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@career-os/shared", "@career-os/engine", "@career-os/agents"],
  serverExternalPackages: ["better-sqlite3", "unpdf", "mammoth"],
};

export default nextConfig;
