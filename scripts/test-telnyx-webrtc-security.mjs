import assert from "node:assert/strict";
import test from "node:test";

/**
 * Lightweight security unit tests for softphone WebRTC helpers.
 * Run: node --experimental-strip-types --test is not used;
 * instead we inline the pure helpers to avoid TS compile dependency.
 */

function isSoftphoneWebrtcEnabled(value = "0") {
  const normalized = String(value ?? "0").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function isSoftphoneEligibleAuth(auth) {
  if (!auth?.userId) return false;
  return (
    auth.role === "staff" &&
    auth.employeeScope === "system" &&
    (auth.staffType === "general_staff" || auth.staffType === "usher_staff")
  );
}

function assertSafeWebrtcAuthPayload(payload) {
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

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const buckets = new Map();

function checkRateLimit(key) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now - existing.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
    buckets.set(key, { count: 1, windowStartedAt: now });
    return { allowed: true };
  }
  if (existing.count >= RATE_LIMIT_MAX) return { allowed: false };
  existing.count += 1;
  return { allowed: true };
}

test("feature flag defaults to disabled", () => {
  assert.equal(isSoftphoneWebrtcEnabled(undefined), false);
  assert.equal(isSoftphoneWebrtcEnabled("0"), false);
  assert.equal(isSoftphoneWebrtcEnabled(""), false);
  assert.equal(isSoftphoneWebrtcEnabled("1"), true);
});

test("only system staff softphone roles are eligible", () => {
  assert.equal(
    isSoftphoneEligibleAuth({
      userId: "u1",
      role: "staff",
      employeeScope: "system",
      staffType: "general_staff",
    }),
    true
  );
  assert.equal(
    isSoftphoneEligibleAuth({
      userId: "u1",
      role: "staff",
      employeeScope: "system",
      staffType: "usher_staff",
    }),
    true
  );
  assert.equal(
    isSoftphoneEligibleAuth({
      userId: "u1",
      role: "admin",
      employeeScope: null,
      staffType: null,
    }),
    false
  );
  assert.equal(
    isSoftphoneEligibleAuth({
      userId: "u1",
      role: "staff",
      employeeScope: "producer",
      staffType: "general_staff",
    }),
    false
  );
});

test("safe payload rejects password/login/username/connection credentials", () => {
  assert.throws(() =>
    assertSafeWebrtcAuthPayload({
      authType: "jwt",
      login_token: "tok",
      password: "x",
    })
  );
  assert.throws(() =>
    assertSafeWebrtcAuthPayload({
      authType: "credentials",
      login: "a",
      username: "a",
      password: "b",
    })
  );
  assert.throws(() =>
    assertSafeWebrtcAuthPayload({
      authType: "jwt",
      login_token: "tok",
      connectionId: "c",
    })
  );
  assert.doesNotThrow(() =>
    assertSafeWebrtcAuthPayload({
      authType: "jwt",
      login_token: "eyJhbGciOiJIUzI1NiJ9.e30.sig",
      expiresIn: 86400,
      callerId: "+972555172720",
      success: true,
    })
  );
});

test("rate limiting blocks after max requests in window", () => {
  buckets.clear();
  for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
    assert.equal(checkRateLimit("u1:1.2.3.4").allowed, true);
  }
  assert.equal(checkRateLimit("u1:1.2.3.4").allowed, false);
});
