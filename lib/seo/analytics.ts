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
    dataLayer?: unknown[];
  }
}

/** Business WhatsApp only. Guest numbers and share links are not inquiries. */
export const BUSINESS_WHATSAPP_PHONE = "972555039072";

const PACKAGE_IDS = new Set(["messages", "voice", "personal", "hybrid"]);
const EVENT_NAME = /^[a-z][a-z0-9_]{0,39}$/;
const SAFE_TOKEN = /^[a-z0-9_:/.-]{1,120}$/i;
const PARAM_KEYS = new Set([
  "page_path",
  "package_id",
  "placement",
  "method",
  "channel",
  "location",
  "destination",
  "currency",
  "ai_source",
  "metric_name",
  "metric_value",
  "metric_rating",
]);

export function safePublicPath(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, "https://www.invistimo.com");
    if (url.username || url.password || url.pathname.includes("@")) return "";
    return url.pathname || "/";
  } catch {
    return "";
  }
}

/** Drops names, phones, emails, message text, and anything outside the allowlist. */
export function sanitizeEventParams(params?: Record<string, string>) {
  const safe: Record<string, string> = {};
  if (!params) return safe;
  for (const [key, raw] of Object.entries(params)) {
    if (!PARAM_KEYS.has(key)) continue;
    const value = String(raw || "").trim();
    if (!value || value.length > 120) continue;
    if (key === "page_path" || key === "destination") {
      const path = safePublicPath(value);
      if (path) safe[key] = path;
      continue;
    }
    if (key === "package_id") {
      if (PACKAGE_IDS.has(value)) safe[key] = value;
      continue;
    }
    if (key === "currency") {
      if (value === "ILS") safe[key] = value;
      continue;
    }
    if (value.includes("@") || /\d{8,}/.test(value) || !SAFE_TOKEN.test(value)) continue;
    safe[key] = value;
  }
  return safe;
}

function whatsappPhone(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "wa.me" || host === "whatsapp.com") {
    return (url.pathname.split("/").filter(Boolean)[0] || "").replace(/\D/g, "");
  }
  if (host === "api.whatsapp.com") {
    return (url.searchParams.get("phone") || "").replace(/\D/g, "");
  }
  return "";
}

export type PublicClickEvent = {
  name: "click_whatsapp" | "click_package" | "click_register" | "click_contact";
  params: Record<string, string>;
};

/**
 * Classifies a public click. Returns null for ordinary navigation and for
 * WhatsApp share links that are not a message to the business.
 * The returned params never include the link query, so prefilled names and
 * phone numbers stay out of GA4.
 */
export function classifyPublicClick(
  href: string,
  pagePath: string,
  options?: { packageId?: string; placement?: string }
): PublicClickEvent | null {
  const page_path = safePublicPath(pagePath) || "/";
  const placement = options?.placement || "";
  let url: URL;
  try {
    url = new URL(href, "https://www.invistimo.com");
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "wa.me" || host === "api.whatsapp.com" || host === "whatsapp.com") {
    if (whatsappPhone(url) !== BUSINESS_WHATSAPP_PHONE) return null;
    const packageId = options?.packageId || "";
    if (PACKAGE_IDS.has(packageId)) {
      return {
        name: "click_package",
        params: sanitizeEventParams({
          page_path,
          package_id: packageId,
          placement: placement || "pricing_order",
        }),
      };
    }
    return {
      name: "click_whatsapp",
      params: sanitizeEventParams({ page_path, placement: placement || "link" }),
    };
  }

  if (url.protocol === "mailto:") {
    return {
      name: "click_contact",
      params: sanitizeEventParams({ page_path, channel: "email", placement: placement || "mailto" }),
    };
  }

  if (host === "invistimo.com") {
    if (url.pathname === "/register" || url.pathname.startsWith("/register/")) {
      return {
        name: "click_register",
        params: sanitizeEventParams({ page_path, placement: placement || "link" }),
      };
    }
    if (url.pathname === "/contact" || url.pathname.startsWith("/contact/")) {
      return {
        name: "click_contact",
        params: sanitizeEventParams({ page_path, channel: "form", placement: placement || "link" }),
      };
    }
  }

  return null;
}

export function trackPublicEvent(name: string, params?: Record<string, string>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (!EVENT_NAME.test(name)) return;
  window.gtag("event", name, sanitizeEventParams(params));
}

function pageLocationWithoutQuery() {
  return `${window.location.origin}${window.location.pathname}`;
}

/**
 * Sends one conversion from a route that does not load the marketing tag.
 * No page_view, no query string, and no personal fields.
 * Resolves when the tag script has loaded, or immediately if it is already on the page.
 */
function sendPrivateConversion(name: "sign_up" | "purchase", params: Record<string, string>) {
  if (typeof window === "undefined" || !isGaMeasurementId(GA_MEASUREMENT_ID)) {
    return Promise.resolve();
  }
  const safe = sanitizeEventParams(params);
  if (document.getElementById("invistimo-ga4") && typeof window.gtag === "function") {
    window.gtag("event", name, safe);
    return Promise.resolve();
  }

  const pageLocation = pageLocationWithoutQuery();
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer?.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: false,
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: pageLocation,
    });
  }
  window.gtag("event", name, safe);

  if (document.getElementById("invistimo-ga4-conversion")) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.id = "invistimo-ga4-conversion";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

export function trackSignupConversion(method: string) {
  if (method !== "site" && method !== "venue") return Promise.resolve();
  return sendPrivateConversion("sign_up", { method });
}

export function trackPurchaseConversion() {
  return sendPrivateConversion("purchase", { currency: "ILS" });
}
