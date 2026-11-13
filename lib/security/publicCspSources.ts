/** Public marketing paths that receive the stricter CSP. No path aliases. */
const PUBLIC_CSP_PATHS = [
  "/",
  "/rsvp",
  "/invitations",
  "/seating-explained",
  "/event-management",
  "/pricing",
  "/faq",
  "/info",
  "/blog",
  "/contact",
  "/credit-gifts",
  "/wedding-website",
  "/services",
  "/terms",
  "/privacy",
  "/cookies",
  "/accessibility",
];

export function publicCspSources() {
  return PUBLIC_CSP_PATHS.flatMap((path) => (path === "/" ? ["/"] : [path, `${path}/:path*`]));
}
