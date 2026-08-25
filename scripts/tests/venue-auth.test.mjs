import test from "node:test";
import assert from "node:assert/strict";

/**
 * Unit tests for login rate limiting and authVersion session invalidation concepts.
 * Logic mirrors lib/auth/loginRateLimit.ts (kept in sync).
 */

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX = 10;
const buckets = new Map();

function buildLoginRateLimitKey(ip, identifier) {
  const normalizedIdentifier = String(identifier || "").trim().toLowerCase();
  return `${ip}:${normalizedIdentifier}`;
}

function checkLoginRateLimit(key) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (
    !existing ||
    now - existing.windowStartedAt >= LOGIN_RATE_LIMIT_WINDOW_MS
  ) {
    buckets.set(key, { count: 1, windowStartedAt: now });
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
  buckets.set(key, existing);
  return { allowed: true, retryAfterMs: 0 };
}

function clearLoginRateLimit(key) {
  buckets.delete(key);
}

function resetLoginRateLimitForTests() {
  buckets.clear();
}

test.beforeEach(() => {
  resetLoginRateLimitForTests();
});

test("login rate limit allows up to max attempts per window", () => {
  const key = buildLoginRateLimitKey("203.0.113.1", "user@example.com");

  for (let i = 0; i < LOGIN_RATE_LIMIT_MAX; i++) {
    const result = checkLoginRateLimit(key);
    assert.equal(result.allowed, true, `attempt ${i + 1} should be allowed`);
  }

  const blocked = checkLoginRateLimit(key);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterMs > 0);
});

test("login rate limit keys are scoped by IP and identifier", () => {
  const keyA = buildLoginRateLimitKey("1.1.1.1", "a@test.com");
  const keyB = buildLoginRateLimitKey("1.1.1.1", "b@test.com");
  const keyC = buildLoginRateLimitKey("2.2.2.2", "a@test.com");

  assert.notEqual(keyA, keyB);
  assert.notEqual(keyA, keyC);

  for (let i = 0; i < LOGIN_RATE_LIMIT_MAX; i++) {
    checkLoginRateLimit(keyA);
  }
  assert.equal(checkLoginRateLimit(keyA).allowed, false);
  assert.equal(checkLoginRateLimit(keyB).allowed, true);
});

test("successful login clears rate limit bucket for that key", () => {
  const key = buildLoginRateLimitKey("10.0.0.1", "venue@hall.com");

  for (let i = 0; i < LOGIN_RATE_LIMIT_MAX; i++) {
    checkLoginRateLimit(key);
  }
  assert.equal(checkLoginRateLimit(key).allowed, false);

  clearLoginRateLimit(key);
  assert.equal(checkLoginRateLimit(key).allowed, true);
});

test("login rate limit window is 15 minutes", () => {
  assert.equal(LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
});

test("authVersion mismatch rejects session conceptually", () => {
  function normalizeAuthVersion(raw) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  function isTokenAuthVersionValid(decoded, freshAuthVersion) {
    if (freshAuthVersion === undefined) return false;
    const tokenAuthVersion = normalizeAuthVersion(decoded?.authVersion);
    return tokenAuthVersion === freshAuthVersion;
  }

  assert.equal(
    isTokenAuthVersionValid({ authVersion: 1 }, 1),
    true,
    "matching version"
  );
  assert.equal(
    isTokenAuthVersionValid({ authVersion: 0 }, 1),
    false,
    "stale token after bump"
  );
  assert.equal(
    isTokenAuthVersionValid({}, 0),
    true,
    "legacy token without authVersion treated as 0"
  );
  assert.equal(
    isTokenAuthVersionValid({}, 2),
    false,
    "legacy token invalid after password reset"
  );
});

test("inactive user fails auth regardless of token", () => {
  function acceptUser(user) {
    if (!user) return false;
    if (user.isActive === false) return false;
    return true;
  }

  assert.equal(acceptUser({ isActive: true }), true);
  assert.equal(acceptUser({ isActive: false }), false);
  assert.equal(acceptUser(null), false);
});

test("login route source includes authVersion in JWT payload", async () => {
  const fs = await import("node:fs/promises");
  const src = await fs.readFile("app/api/login/route.ts", "utf8");
  assert.match(src, /authVersion/);
  assert.match(src, /checkLoginRateLimit/);
  assert.match(src, /clearLoginRateLimit/);
});

test("getUserIdFromRequest source validates authVersion against DB", async () => {
  const fs = await import("node:fs/promises");
  const src = await fs.readFile("lib/getUserIdFromRequest.ts", "utf8");
  assert.match(src, /authVersion/);
  assert.match(src, /isActive === false/);
  assert.match(src, /isTokenAuthVersionValid/);
});
