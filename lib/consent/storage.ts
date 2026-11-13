import {
  ANALYTICS_SIGNAL_COOKIE,
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_POLICY_VERSION,
  CONSENT_STORAGE_KEY,
  type ConsentChoices,
  type ConsentRecord,
  defaultConsentChoices,
} from "@/lib/consent/policy";

function isChoices(value: unknown): value is ConsentChoices {
  if (!value || typeof value !== "object") return false;
  const choices = value as Partial<ConsentChoices>;
  return (
    choices.necessary === true &&
    typeof choices.analytics === "boolean" &&
    typeof choices.functional === "boolean"
  );
}

export function parseConsent(raw: string | null | undefined): ConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (parsed.version !== CONSENT_POLICY_VERSION) return null;
    if (!isChoices(parsed.choices)) return null;
    if (typeof parsed.updatedAt !== "string" || !parsed.updatedAt) return null;
    return {
      version: parsed.version,
      choices: {
        necessary: true,
        analytics: parsed.choices.analytics,
        functional: parsed.choices.functional,
      },
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function createConsentRecord(choices: Pick<ConsentChoices, "analytics" | "functional">): ConsentRecord {
  return {
    version: CONSENT_POLICY_VERSION,
    choices: {
      ...defaultConsentChoices(),
      analytics: choices.analytics,
      functional: choices.functional,
    },
    updatedAt: new Date().toISOString(),
  };
}

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const parts = document.cookie.split(";").map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));
  if (!found) return "";
  return decodeURIComponent(found.slice(name.length + 1));
}

export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Private mode can block localStorage. The cookie is the fallback.
  }
  return parseConsent(readCookie(CONSENT_COOKIE_NAME));
}

export function hasAnalyticsConsent() {
  return readConsent()?.choices.analytics === true;
}

export function hasFunctionalConsent() {
  return readConsent()?.choices.functional === true;
}

export function writeConsent(record: ConsentRecord) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(record);
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serialized);
  } catch {
    // Ignore quota / private-mode failures and still try the cookie.
  }
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const base = `Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(serialized)}; ${base}`;
  document.cookie = `${ANALYTICS_SIGNAL_COOKIE}=${record.choices.analytics ? "granted" : "denied"}; ${base}`;
}
