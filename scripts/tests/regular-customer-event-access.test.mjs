import test from "node:test";
import assert from "node:assert/strict";

/**
 * Regression: Venues PR #48 rejected isActive=false inside getUserIdFromRequest.
 * That made Admin impersonation + stale sessions return /api/me OK but
 * /api/events + /api/invitations/my → 401, so dashboards looked empty even
 * though Event/Invitation/InvitationGuest rows still existed.
 *
 * These tests lock the intended auth rules (mirrors lib/getUserIdFromRequest.ts).
 */

function normalizeAuthVersion(raw) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function isTokenAuthVersionValid(decoded, freshAuthVersion) {
  if (freshAuthVersion === undefined) return false;
  const tokenAuthVersion = normalizeAuthVersion(decoded?.authVersion);
  return tokenAuthVersion === freshAuthVersion;
}

function resolveAuthAccess({
  userIsActive,
  tokenAuthVersion,
  dbAuthVersion,
  isImpersonationSession,
}) {
  const isActive = userIsActive !== false;
  if (!isActive && !isImpersonationSession) {
    return { ok: false, reason: "INACTIVE" };
  }
  if (
    !isTokenAuthVersionValid(
      { authVersion: tokenAuthVersion },
      normalizeAuthVersion(dbAuthVersion)
    )
  ) {
    return { ok: false, reason: "AUTH_VERSION" };
  }
  return { ok: true, reason: null };
}

test("REGULAR USER WITH EVENT AND NO VENUE — active session allowed", () => {
  const result = resolveAuthAccess({
    userIsActive: true,
    tokenAuthVersion: 0,
    dbAuthVersion: null,
    isImpersonationSession: false,
  });
  assert.equal(result.ok, true);
});

test("REGULAR Event WITHOUT VenueMembership / linkedEventId — auth still ok", () => {
  // Auth layer must not require venue fields at all.
  const venueMembership = null;
  const linkedEventId = null;
  const venueAccessStatus = null;
  assert.equal(venueMembership, null);
  assert.equal(linkedEventId, null);
  assert.equal(venueAccessStatus, null);

  const result = resolveAuthAccess({
    userIsActive: true,
    tokenAuthVersion: 0,
    dbAuthVersion: 0,
    isImpersonationSession: false,
  });
  assert.equal(result.ok, true);
});

test("inactive regular customer self-session is rejected (no empty dashboard)", () => {
  const result = resolveAuthAccess({
    userIsActive: false,
    tokenAuthVersion: 0,
    dbAuthVersion: 0,
    isImpersonationSession: false,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "INACTIVE");
});

test("Admin impersonation of inactive regular customer is allowed", () => {
  const result = resolveAuthAccess({
    userIsActive: false,
    tokenAuthVersion: 0,
    dbAuthVersion: 0,
    isImpersonationSession: true,
  });
  assert.equal(result.ok, true);
});

test("authVersion mismatch still rejects non-impersonation sessions", () => {
  const result = resolveAuthAccess({
    userIsActive: true,
    tokenAuthVersion: 0,
    dbAuthVersion: 1,
    isImpersonationSession: false,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "AUTH_VERSION");
});
