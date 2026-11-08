import type { NextConfig } from "next";

/** Media/scratch paths that must never be copied into Serverless Function traces. */
const SERVERLESS_MEDIA_EXCLUDES = [
  "./tmp/**/*",
  "./temp/**/*",
  "./.cache/**/*",
  "./coverage/**/*",
  "./playwright-report/**/*",
  "./test-results/**/*",
  "./scripts/**/*",
  // Local Windows ffmpeg binary must never ship in Linux lambdas.
  "./node_modules/ffmpeg-static/ffmpeg.exe",
  "./node_modules/ffmpeg-static/ffmpeg.exe.README",
  // Public hero/marketing media stays on CDN; never copy into lambdas.
  "./public/videos/**/*",
  "./public/marketing/videos/**/*",
  "./public/marketing/luxury/**/*",
  "./public/**/*.mp4",
  "./public/**/*.webm",
  "./public/**/*.mov",
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Keep ffmpeg-static external so its path is not rewritten to /ROOT/... at build time.
  serverExternalPackages: ["ffmpeg-static", "web-push", "@hebcal/core"],
  async redirects() {
    return [
      // /info/guides/reduce-meal-waste is a live Phase C guide — do not redirect it.
      {
        source: "/for/henna",
        destination: "/rsvp/hina",
        permanent: true,
      },
      {
        source: "/info/guides",
        destination: "/blog",
        statusCode: 301,
      },
    ];
  },
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    const privateSources = [
      "/login",
      "/login/:path*",
      "/register",
      "/register/:path*",
      "/forgot-password",
      "/forgot-password/:path*",
      "/reset-password",
      "/reset-password/:path*",
      "/set-password",
      "/set-password/:path*",
      "/dashboard",
      "/dashboard/:path*",
      "/admin",
      "/admin/:path*",
      "/producer",
      "/producer/:path*",
      "/producer-staff",
      "/producer-staff/:path*",
      "/employee",
      "/employee/:path*",
      "/staff",
      "/staff/:path*",
      "/venues",
      "/venues/:path*",
      "/events",
      "/events/:path*",
      "/try",
      "/try/:path*",
      "/invite",
      "/invite/:path*",
      "/w",
      "/w/:path*",
      "/e",
      "/e/:path*",
      "/live",
      "/live/:path*",
      "/check-in",
      "/check-in/:path*",
      "/wedding-challenges",
      "/wedding-challenges/:path*",
      "/payment",
      "/payment/:path*",
      "/sales-documents",
      "/sales-documents/:path*",
      "/menus",
      "/menus/:path*",
      "/plans",
      "/plans/:path*",
      "/thank-you",
      "/client-contracts",
      "/client-contracts/:path*",
      "/venue-client",
      "/venue-client/:path*",
    ];

    return [
      {
        source: "/push-sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      ...privateSources.map((source) => ({ source, headers: noindex })),
    ];
  },
  /**
   * Prevent scratch / marketing media from being traced into Serverless
   * bundles. Public hero videos stay available via CDN static hosting;
   * they must not be copied into API lambdas (was ~+1GB per function).
   *
   * Keep ffmpeg includes for IVR routes that compose audio at runtime.
   */
  outputFileTracingExcludes: {
    // Multiple globs: Next matches route path with picomatch.
    "/*": SERVERLESS_MEDIA_EXCLUDES,
    "/**": SERVERLESS_MEDIA_EXCLUDES,
    "/api/*": SERVERLESS_MEDIA_EXCLUDES,
    "/api/**": SERVERLESS_MEDIA_EXCLUDES,
  },
  outputFileTracingIncludes: {
    "/api/ivr/config": [
      "./node_modules/ffmpeg-static/ffmpeg",
      "./node_modules/ffmpeg-static/package.json",
      "./node_modules/ffmpeg-static/index.js",
    ],
    // Demo audio only — not the marketing video trees.
    "/api/marketing/rsvp-calls-demo": [
      "./public/audio/rsvp-calls-dana-demo.mp3",
    ],
  },
};

export default nextConfig;
