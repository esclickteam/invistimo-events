export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

export function isGaMeasurementId(value: string) {
  return /^G-[A-Z0-9]+$/.test(value);
}

const PRIVATE_PREFIXES = [
  "/invite",
  "/w",
  "/e",
  "/live",
  "/dashboard",
  "/admin",
  "/menus",
  "/sales-documents",
  "/try",
  "/employee",
  "/staff",
  "/producer",
  "/producer-staff",
  "/venues",
  "/reset-password",
  "/set-password",
  "/forgot-password",
  "/login",
  "/register",
  "/payment",
  "/client-contracts",
  "/venue-client",
  "/plans",
  "/check-in",
  "/wedding-challenges",
  "/events",
  "/thank-you",
];

export function contentGroup(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/info/guides")) return "guides";
  if (pathname.startsWith("/rsvp") || pathname.startsWith("/invitations")) return "rsvp_invitations";
  if (pathname.startsWith("/services/")) return "services";
  if (pathname.startsWith("/seating-explained")) return "seating";
  if (pathname.startsWith("/event-management")) return "event_management";
  if (pathname === "/pricing") return "pricing";
  if (pathname.startsWith("/wedding-website")) return "wedding_website";
  if (pathname === "/credit-gifts") return "credit_gifts";
  if (pathname === "/faq" || pathname.startsWith("/info/") || pathname === "/contact") return "trust";
  return "other";
}

export function analyticsAllowed(pathname: string) {
  return !PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

const AI_HOST_MARKERS: { marker: string; label: string }[] = [
  { marker: "chatgpt.com", label: "chatgpt" },
  { marker: "chat.openai.com", label: "chatgpt" },
  { marker: "perplexity.ai", label: "perplexity" },
  { marker: "gemini.google.com", label: "gemini" },
  { marker: "copilot.microsoft.com", label: "copilot" },
  { marker: "claude.ai", label: "claude" },
];

const AI_UTM_MARKERS: { marker: string; label: string }[] = [
  { marker: "chatgpt", label: "chatgpt" },
  { marker: "openai", label: "chatgpt" },
  { marker: "perplexity", label: "perplexity" },
  { marker: "gemini", label: "gemini" },
  { marker: "copilot", label: "copilot" },
  { marker: "claude", label: "claude" },
];

export function aiReferrerLabel(referrer: string) {
  const value = referrer.toLowerCase();
  for (const item of AI_HOST_MARKERS) {
    if (value.includes(item.marker)) return item.label;
  }
  return "";
}

/** Also catch AI traffic that arrives with empty referrer but tagged UTMs. */
export function aiUtmLabel(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const blob = [
    params.get("utm_source") || "",
    params.get("utm_medium") || "",
    params.get("utm_campaign") || "",
  ]
    .join(" ")
    .toLowerCase();
  if (!blob.trim()) return "";
  for (const item of AI_UTM_MARKERS) {
    if (blob.includes(item.marker)) return item.label;
  }
  return "";
}

export function aiTrafficLabel(referrer: string, search = "") {
  return aiReferrerLabel(referrer) || aiUtmLabel(search);
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPublicEvent(name: string, params?: Record<string, string>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params || {});
}
