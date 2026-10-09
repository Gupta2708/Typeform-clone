import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  turbopack: { root: process.cwd() },
  async rewrites() {
    const backend = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
    return [
      { source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
