import { isAnalyticsBrowserCookie } from "@/lib/consent/policy";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
    __invistimoConsentDefault?: boolean;
    __invistimoConsentReady?: boolean;
    __invistimoBlockMeasurement?: boolean;
    __invistimoMeasurementGuard?: boolean;
  }
}

const DENIED_ADS = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

function gtagReady(): Gtag {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer?.push(arguments);
    };
  }
  return window.gtag;
}

function isMeasurementCollect(url: string) {
  return (
    url.includes("google-analytics.com") ||
    url.includes("analytics.google.com") ||
    url.includes("/g/collect") ||
    url.includes("/j/collect")
  );
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * Once gtag.js is already on the page, Consent Mode still flushes a hit when
 * analytics is turned off. This guard drops those collects until a later grant
 * clears the flag. Script loads use a script tag, so they are not affected.
 */
function installMeasurementGuard() {
  if (typeof window === "undefined" || window.__invistimoMeasurementGuard) return;
  window.__invistimoMeasurementGuard = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (window.__invistimoBlockMeasurement && isMeasurementCollect(requestUrl(input))) {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return originalFetch(input, init);
  };

  if (typeof navigator.sendBeacon === "function") {
    const originalBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      if (window.__invistimoBlockMeasurement && isMeasurementCollect(String(url))) return true;
      return originalBeacon(url, data);
    };
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function open(this: XMLHttpRequest & { __invistimoUrl?: string }, method: string, url: string | URL) {
    this.__invistimoUrl = String(url);
    return originalOpen.apply(this, arguments as unknown as Parameters<typeof originalOpen>);
  };
  XMLHttpRequest.prototype.send = function send(this: XMLHttpRequest & { __invistimoUrl?: string }) {
    if (window.__invistimoBlockMeasurement && isMeasurementCollect(this.__invistimoUrl || "")) return;
    return originalSend.apply(this, arguments as unknown as Parameters<typeof originalSend>);
  };

  const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (src?.set && src.get) {
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: true,
      enumerable: src.enumerable,
      get: src.get,
      set(value: string) {
        if (window.__invistimoBlockMeasurement && isMeasurementCollect(String(value))) return;
        src.set!.call(this, value);
      },
    });
  }
}

/** Blocks or releases GA collects in the current document. Does not load a script. */
export function setMeasurementTransportBlocked(blocked: boolean) {
  if (typeof window === "undefined") return;
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
  installMeasurementGuard();
  window.__invistimoBlockMeasurement = blocked;
  if (!measurementId) return;
  const disableKey = `ga-disable-${measurementId}`;
  const flags = window as unknown as Record<string, unknown>;
  if (blocked) {
    flags[disableKey] = true;
    return;
  }
  delete flags[disableKey];
}

/** Consent Mode v2 defaults. This does not load gtag.js and does not send a hit. */
export function ensureGoogleConsentDefault() {
  if (typeof window === "undefined" || window.__invistimoConsentDefault) return;
  const gtag = gtagReady();
  gtag("consent", "default", {
    ...DENIED_ADS,
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted",
    wait_for_update: 500,
  });
  window.__invistimoConsentDefault = true;
}

export function updateGoogleAnalyticsConsent(granted: boolean) {
  if (typeof window === "undefined") return;
  ensureGoogleConsentDefault();
  gtagReady()("consent", "update", {
    ...DENIED_ADS,
    analytics_storage: granted ? "granted" : "denied",
  });
}

export function clearGoogleAnalyticsCookies() {
  if (typeof document === "undefined") return;
  const names = document.cookie
    .split(";")
    .map((part) => part.split("=")[0]?.trim() || "")
    .filter(isAnalyticsBrowserCookie);
  const host = window.location.hostname;
  const domains = ["", host];
  if (host === "invistimo.com" || host.endsWith(".invistimo.com")) {
    domains.push(".invistimo.com");
  }
  for (const name of names) {
    for (const domain of domains) {
      const domainPart = domain ? `; domain=${domain}` : "";
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainPart}`;
    }
  }
}

let scriptLoading: Promise<void> | null = null;

/** Loads the GA4 tag once. Call only after analytics consent was granted. */
export function loadGoogleAnalyticsScript(measurementId: string) {
  if (typeof document === "undefined") return Promise.resolve();
  if (document.getElementById("invistimo-ga4")) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve) => {
    const script = document.createElement("script");
    script.id = "invistimo-ga4";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
  return scriptLoading;
}
