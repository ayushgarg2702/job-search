import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@career-os/shared", "@career-os/engine", "@career-os/agents"],
  serverExternalPackages: ["better-sqlite3", "unpdf", "mammoth"],
  // The preview opens the app as 127.0.0.1 while the server also answers on the pod IP.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
