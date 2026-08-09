import { getClientIp } from "@/lib/telnyx/webrtcSecurity";

export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_RATE_LIMIT_MAX = 10;

type RateBucket = {
  count: number;
  windowStartedAt: number;
};

const rateLimitBuckets = new Map<string, RateBucket>();

export function buildLoginRateLimitKey(ip: string, identifier: string) {
  const normalizedIdentifier = String(identifier || "")
    .trim()
    .toLowerCase();
  return `${ip}:${normalizedIdentifier}`;
}

export function buildLoginRateLimitKeyFromRequest(
  req: Request,
  identifier: string
) {
  return buildLoginRateLimitKey(getClientIp(req), identifier);
}

export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);

  if (
    !existing ||
    now - existing.windowStartedAt >= LOGIN_RATE_LIMIT_WINDOW_MS
  ) {
    rateLimitBuckets.set(key, { count: 1, windowStartedAt: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= LOGIN_RATE_LIMIT_MAX) {
    const retryAfterMs =
      LOGIN_RATE_LIMIT_WINDOW_MS - (now - existing.windowStartedAt);
    return {
      allowed: false,
      retryAfterMs: Math.max(retryAfterMs, 1),
    };
  }

  existing.count += 1;
  rateLimitBuckets.set(key, existing);
  return { allowed: true, retryAfterMs: 0 };
}

export function clearLoginRateLimit(key: string) {
  rateLimitBuckets.delete(key);
}

/** Test helper — clears in-memory rate-limit state. */
export function resetLoginRateLimitForTests() {
  rateLimitBuckets.clear();
}
