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

export function analyticsAllowed(pathname: string) {
  return !PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function aiReferrerLabel(referrer: string) {
  const value = referrer.toLowerCase();
  if (value.includes("chatgpt.com") || value.includes("chat.openai.com")) return "chatgpt";
  if (value.includes("perplexity.ai")) return "perplexity";
  if (value.includes("gemini.google.com")) return "gemini";
  if (value.includes("copilot.microsoft.com")) return "copilot";
  if (value.includes("claude.ai")) return "claude";
  return "";
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
