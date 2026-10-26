import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Keep ffmpeg-static external so its path is not rewritten to /ROOT/... at build time.
  serverExternalPackages: ["ffmpeg-static", "web-push", "@hebcal/core"],
  async redirects() {
    return [
      {
        source: "/info/guides/reduce-meal-waste",
        destination: "/info/guides/wedding-venue-guest-guarantee",
        permanent: true,
      },
      {
        source: "/for/henna",
        destination: "/rsvp/hina",
        permanent: true,
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
      "/preview",
      "/preview/:path*",
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
  outputFileTracingIncludes: {
    "/api/ivr/config": [
      "./node_modules/ffmpeg-static/ffmpeg",
      "./node_modules/ffmpeg-static/package.json",
      "./node_modules/ffmpeg-static/index.js",
    ],
  },
};

export default nextConfig;
