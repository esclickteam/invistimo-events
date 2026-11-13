/**
 * Document security headers.
 *
 * script-src keeps 'unsafe-inline' and 'unsafe-eval' because this Next.js
 * App Router build injects inline bootstrap and JSON-LD scripts, and the
 * product uses libraries (pdf.js, Konva, animation runtimes) that call
 * eval / new Function. A per-request nonce is not applied: static headers
 * cannot vary per request, and wrapping every middleware branch would risk
 * the existing auth redirects. Hosts below are the third parties the app
 * actually loads in the browser.
 *
 * style-src 'unsafe-inline' is required for React style attributes and
 * Emotion / MUI style tags.
 *
 * img-src, media-src, frame-src and connect-src allow https/wss because
 * guest media, maps, payments and telephony are not limited to one host.
 * frame-ancestors and object-src stay strict.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://maps.googleapis.com https://maps.gstatic.com https://cdn.userway.org https://*.telnyx.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://cdn.userway.org",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://cdn.userway.org",
  "connect-src 'self' https: wss: blob:",
  "media-src 'self' blob: data: https:",
  "frame-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

/**
 * Second policy for public marketing documents. Browsers enforce every
 * Content-Security-Policy header, so this removes unsafe-eval and the open
 * https: connect/frame/media allowances on those pages only. Dashboard,
 * seating, PDF, telephony, guest media and payments keep the broader policy.
 * unsafe-inline stays: Next.js injects inline bootstrap scripts, and React
 * style attributes are not nonce-compatible with these static headers.
 */
export const PUBLIC_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://maps.googleapis.com https://maps.gstatic.com https://cdn.userway.org",
  "style-src 'self' 'unsafe-inline' https://cdn.userway.org",
  "img-src 'self' data: blob: https://res.cloudinary.com https://maps.gstatic.com https://maps.googleapis.com https://cdn.userway.org https://www.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self' data: https://cdn.userway.org",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://stats.g.doubleclick.net https://cdn.userway.org https://api.userway.org https://*.userway.org https://maps.googleapis.com https://maps.gstatic.com https://places.googleapis.com",
  "media-src 'self' blob: data:",
  "frame-src 'self' blob: https://www.google.com https://maps.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

export const DOCUMENT_SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
];

export const PUBLIC_DOCUMENT_CSP_HEADER = {
  key: "Content-Security-Policy",
  value: PUBLIC_CONTENT_SECURITY_POLICY,
};
