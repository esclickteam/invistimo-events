import assert from "node:assert/strict";
import test from "node:test";

const ACTIVE = new Set([
  "claimed",
  "dialing",
  "ringing",
  "answered",
  "bridged",
]);

const RETRYABLE = new Set([
  "failed_timeout",
  "failed_rejected",
  "failed_canceled",
  "failed_busy",
  "failed",
]);

const MAX_ATTEMPTS = 2;
const CAPACITY_SOFT_LIMIT = 8;
const VOICE_APP_ID = "2972009098091955745";

function isActiveBridgeStatus(status) {
  return ACTIVE.has(String(status || ""));
}

function mapHangupCauseToBridgeStatus(cause) {
  const c = String(cause || "").toLowerCase();
  if (c.includes("busy") || c.includes("user_busy")) return "failed_busy";
  if (c.includes("reject")) return "failed_rejected";
  if (c.includes("cancel")) return "failed_canceled";
  if (c.includes("timeout") || c.includes("no_answer") || c.includes("no-answer")) {
    return "failed_timeout";
  }
  if (c.includes("normal") || c.includes("originator")) return "completed";
  return "failed";
}

function credentialBlockedByBusyHistory(attempt, credentialId) {
  const id = String(credentialId || "").trim();
  if (!id || !attempt) return false;
  return (attempt.busyCredentialIds || []).includes(id);
}

function getVoiceAppConnectionId(env = {}) {
  const fromEnv = String(
    env.TELNYX_CALL_CONTROL_APP_ID ||
      env.TELNYX_VOICE_CONNECTION_ID ||
      env.TELNYX_CONNECTION_ID ||
      ""
  ).trim();
  const webrtc = String(env.TELNYX_WEBRTC_CONNECTION_ID || "").trim();
  if (fromEnv && fromEnv !== webrtc) return fromEnv;
  return VOICE_APP_ID;
}

/**
 * In-memory simulation of claimInboundBridgeAttempt rules.
 */
function createBridgeStore() {
  const byInbound = new Map();

  function countActive() {
    let n = 0;
    for (const row of byInbound.values()) {
      if (isActiveBridgeStatus(row.status) && !row.endedAt) n += 1;
    }
    return n;
  }

  function claim(inboundCallControlId) {
    if (!inboundCallControlId) return { ok: false, reason: "MISSING_CALL_CONTROL_ID" };
    if (countActive() >= CAPACITY_SOFT_LIMIT) {
      return { ok: false, reason: "CAPACITY_SOFT_LIMIT" };
    }

    const existing = byInbound.get(inboundCallControlId);
    if (!existing) {
      const created = {
        inboundCallControlId,
        status: "claimed",
        attemptNumber: 1,
        busyCredentialIds: [],
        endedAt: null,
        outboundCallControlId: null,
      };
      byInbound.set(inboundCallControlId, created);
      return { ok: true, mode: "created", attempt: created };
    }

    if (isActiveBridgeStatus(existing.status)) {
      return { ok: false, reason: "ACTIVE_BRIDGE_EXISTS", attempt: existing };
    }
    if (existing.attemptNumber >= MAX_ATTEMPTS) {
      return { ok: false, reason: "MAX_ATTEMPTS", attempt: existing };
    }
    if (!RETRYABLE.has(existing.status) || !existing.endedAt) {
      return { ok: false, reason: "ACTIVE_BRIDGE_EXISTS", attempt: existing };
    }

    existing.status = "claimed";
    existing.attemptNumber += 1;
    existing.endedAt = null;
    existing.outboundCallControlId = null;
    return { ok: true, mode: "retry", attempt: existing };
  }

  function markDialing(inboundCallControlId, outboundId) {
    const row = byInbound.get(inboundCallControlId);
    if (!row || row.status !== "claimed") return false;
    row.status = "ringing";
    row.outboundCallControlId = outboundId;
    return true;
  }

  function hangupOutbound(inboundCallControlId, cause) {
    const row = byInbound.get(inboundCallControlId);
    if (!row) return null;
    row.status = mapHangupCauseToBridgeStatus(cause);
    row.endedAt = new Date().toISOString();
    if (row.status === "failed_busy" && row.credentialId) {
      row.busyCredentialIds.push(row.credentialId);
    }
    row.outboundCallControlId = null;
    return row;
  }

  return { claim, markDialing, hangupOutbound, countActive, byInbound };
}

test("Voice App connection never falls back to WebRTC credential connection", () => {
  assert.equal(
    getVoiceAppConnectionId({
      TELNYX_CONNECTION_ID: "2972732112425191076",
      TELNYX_WEBRTC_CONNECTION_ID: "2972732112425191076",
    }),
    VOICE_APP_ID
  );
  assert.equal(
    getVoiceAppConnectionId({
      TELNYX_CONNECTION_ID: VOICE_APP_ID,
      TELNYX_WEBRTC_CONNECTION_ID: "2972732112425191076",
    }),
    VOICE_APP_ID
  );
});

test("hangup cause mapping", () => {
  assert.equal(mapHangupCauseToBridgeStatus("user_busy"), "failed_busy");
  assert.equal(mapHangupCauseToBridgeStatus("timeout"), "failed_timeout");
  assert.equal(mapHangupCauseToBridgeStatus("normal_clearing"), "completed");
});

test("duplicate webhook creates only one outbound claim", () => {
  const store = createBridgeStore();
  const id = "v3:inbound-1";

  const first = store.claim(id);
  assert.equal(first.ok, true);
  assert.equal(first.mode, "created");
  assert.equal(store.markDialing(id, "v3:outbound-1"), true);

  const dials = [];
  for (let i = 0; i < 10; i += 1) {
    const next = store.claim(id);
    if (next.ok) dials.push(next);
  }

  assert.equal(dials.length, 0);
  assert.equal(store.countActive(), 1);
  assert.equal(store.byInbound.get(id).outboundCallControlId, "v3:outbound-1");
});

test("10 identical webhooks do not create 10 dials", () => {
  const store = createBridgeStore();
  const id = "v3:inbound-burst";
  let created = 0;
  for (let i = 0; i < 10; i += 1) {
    const result = store.claim(id);
    if (result.ok && result.mode === "created") {
      created += 1;
      store.markDialing(id, `v3:out-${created}`);
    }
  }
  assert.equal(created, 1);
  assert.equal(store.countActive(), 1);
});

test("user_busy closes outbound and blocks same credential retry", () => {
  const store = createBridgeStore();
  const id = "v3:inbound-busy";
  const claim = store.claim(id);
  assert.equal(claim.ok, true);
  claim.attempt.credentialId = "cred-A";
  store.markDialing(id, "v3:out-busy");

  const after = store.hangupOutbound(id, "user_busy");
  assert.equal(after.status, "failed_busy");
  assert.equal(after.endedAt != null, true);
  assert.equal(after.outboundCallControlId, null);
  assert.equal(credentialBlockedByBusyHistory(after, "cred-A"), true);

  // Same inbound may retry once with a different credential; same cred stays blocked.
  const retry = store.claim(id);
  assert.equal(retry.ok, true);
  assert.equal(retry.mode, "retry");
  assert.equal(credentialBlockedByBusyHistory(retry.attempt, "cred-A"), true);
  assert.equal(credentialBlockedByBusyHistory(retry.attempt, "cred-B"), false);
});

test("retry only after previous leg ended with retryable status", () => {
  const store = createBridgeStore();
  const id = "v3:inbound-retry";
  assert.equal(store.claim(id).ok, true);
  store.markDialing(id, "v3:out-1");
  store.hangupOutbound(id, "timeout");

  const retry = store.claim(id);
  assert.equal(retry.ok, true);
  assert.equal(retry.mode, "retry");
  assert.equal(retry.attempt.attemptNumber, 2);
  assert.equal(retry.attempt.outboundCallControlId, null);

  store.markDialing(id, "v3:out-2");
  store.hangupOutbound(id, "timeout");
  const third = store.claim(id);
  assert.equal(third.ok, false);
  assert.equal(third.reason, "MAX_ATTEMPTS");
});

test("answered/bridged call is not retryable", () => {
  const store = createBridgeStore();
  const id = "v3:inbound-answered";
  store.claim(id);
  store.markDialing(id, "v3:out");
  const row = store.byInbound.get(id);
  row.status = "answered";
  const retry = store.claim(id);
  assert.equal(retry.ok, false);
  assert.equal(retry.reason, "ACTIVE_BRIDGE_EXISTS");
});

test("two different inbound calls can claim in parallel", () => {
  const store = createBridgeStore();
  const a = store.claim("v3:a");
  const b = store.claim("v3:b");
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  store.markDialing("v3:a", "v3:out-a");
  store.markDialing("v3:b", "v3:out-b");
  assert.equal(store.countActive(), 2);
});

test("capacity soft limit blocks new claims before Telnyx cap", () => {
  const store = createBridgeStore();
  for (let i = 0; i < CAPACITY_SOFT_LIMIT; i += 1) {
    const id = `v3:cap-${i}`;
    assert.equal(store.claim(id).ok, true);
    store.markDialing(id, `v3:out-${i}`);
  }
  const blocked = store.claim("v3:cap-overflow");
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "CAPACITY_SOFT_LIMIT");
});
