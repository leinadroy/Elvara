import type { NextConfig } from "next";

/** NestJS API. Browser memanggil /api/v1/* di origin web; Next meneruskannya ke API agar cookie sesi tetap satu origin. */
const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
