import type { AuthPayload } from "@/lib/getUserIdFromRequest";

export const SOFTPHONE_WEBRTC_TOKEN_TTL_SECONDS = 60 * 60 * 24;
export const SOFTPHONE_WEBRTC_RATE_LIMIT_WINDOW_MS = 60_000;
export const SOFTPHONE_WEBRTC_RATE_LIMIT_MAX = 10;

type RateBucket = {
  count: number;
  windowStartedAt: number;
};

const rateLimitBuckets = new Map<string, RateBucket>();

export function isSoftphoneWebrtcEnabled(
  value: string | undefined = process.env.SOFTPHONE_WEBRTC_ENABLED
): boolean {
  const normalized = String(value ?? "0").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function isSoftphoneEligibleAuth(auth: AuthPayload | null | undefined): boolean {
  if (!auth?.userId) return false;

  return (
    auth.role === "staff" &&
    auth.employeeScope === "system" &&
    (auth.staffType === "general_staff" || auth.staffType === "usher_staff")
  );
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim();
  if (first) return first;

  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function checkSoftphoneWebrtcRateLimit(key: string): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);

  if (!existing || now - existing.windowStartedAt >= SOFTPHONE_WEBRTC_RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { count: 1, windowStartedAt: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= SOFTPHONE_WEBRTC_RATE_LIMIT_MAX) {
    const retryAfterMs =
      SOFTPHONE_WEBRTC_RATE_LIMIT_WINDOW_MS - (now - existing.windowStartedAt);
    return {
      allowed: false,
      retryAfterMs: Math.max(retryAfterMs, 1),
    };
  }

  existing.count += 1;
  rateLimitBuckets.set(key, existing);
  return { allowed: true, retryAfterMs: 0 };
}

/** Test helper — clears in-memory rate-limit state. */
export function resetSoftphoneWebrtcRateLimitForTests() {
  rateLimitBuckets.clear();
}

export function normalizeCallerNumber(value: string) {
  let clean = String(value || "").trim();

  clean = clean.replace(/[^\d+]/g, "");
  clean = clean.replace(/\+/g, (match, offset) => (offset === 0 ? match : ""));

  if (!clean) return "";

  if (clean.startsWith("00")) {
    clean = `+${clean.slice(2)}`;
  }

  if (clean.startsWith("+")) {
    return clean;
  }

  if (clean.startsWith("972")) {
    return `+${clean}`;
  }

  if (clean.startsWith("0") && clean.length >= 8) {
    return `+972${clean.slice(1)}`;
  }

  return clean;
}

export function assertSafeWebrtcAuthPayload(payload: Record<string, unknown>) {
  const forbiddenKeys = [
    "password",
    "login",
    "username",
    "sip_password",
    "sip_username",
    "TELNYX_WEBRTC_PASSWORD",
    "TELNYX_WEBRTC_USERNAME",
    "connectionId",
    "connection_id",
  ];

  for (const key of forbiddenKeys) {
    if (key in payload) {
      throw new Error(`UNSAFE_WEBRTC_AUTH_PAYLOAD:${key}`);
    }
  }

  if (payload.authType !== "jwt") {
    throw new Error("UNSAFE_WEBRTC_AUTH_PAYLOAD:authType");
  }

  if (typeof payload.login_token !== "string" || !payload.login_token) {
    throw new Error("UNSAFE_WEBRTC_AUTH_PAYLOAD:login_token");
  }
}
