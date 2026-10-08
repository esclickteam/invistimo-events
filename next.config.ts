import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Keep ffmpeg-static external so its path is not rewritten to /ROOT/... at build time.
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/ivr/config": [
      "./node_modules/ffmpeg-static/ffmpeg",
      "./node_modules/ffmpeg-static/package.json",
      "./node_modules/ffmpeg-static/index.js",
    ],
  },
};

export default nextConfig;
