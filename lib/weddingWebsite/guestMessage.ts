import { getClientIp } from "@/lib/telnyx/webrtcSecurity";

export const GUEST_MESSAGE_MAX_LENGTH = 1000;
export const GUEST_MESSAGE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const GUEST_MESSAGE_RATE_LIMIT_MAX = 20;

type RateBucket = {
  count: number;
  windowStartedAt: number;
};

const rateLimitBuckets = new Map<string, RateBucket>();

export function sanitizeGuestMessage(value: unknown): string {
  const raw = typeof value === "string" ? value : "";

  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;[^&]*&gt;/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, GUEST_MESSAGE_MAX_LENGTH);
}

export function buildGuestMessageRateLimitKey(req: Request, token: string) {
  const ip = getClientIp(req);
  const cleanToken = String(token || "").trim();
  return `${ip}:${cleanToken}`;
}

export function checkGuestMessageRateLimit(key: string): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);

  if (
    !existing ||
    now - existing.windowStartedAt >= GUEST_MESSAGE_RATE_LIMIT_WINDOW_MS
  ) {
    rateLimitBuckets.set(key, { count: 1, windowStartedAt: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= GUEST_MESSAGE_RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterMs: Math.max(
        GUEST_MESSAGE_RATE_LIMIT_WINDOW_MS - (now - existing.windowStartedAt),
        1
      ),
    };
  }

  existing.count += 1;
  rateLimitBuckets.set(key, existing);
  return { allowed: true, retryAfterMs: 0 };
}

export function resetGuestMessageRateLimitForTests() {
  rateLimitBuckets.clear();
}
