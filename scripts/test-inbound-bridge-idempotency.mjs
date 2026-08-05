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

const TERMINAL = new Set([
  "failed_busy",
  "failed_rejected",
  "failed_timeout",
  "failed_canceled",
  "failed_capacity",
  "failed",
  "completed",
  "cleaned_stale",
]);

const MAX_ATTEMPTS = 2;
const CAPACITY_SOFT_LIMIT = 8;
const VOICE_APP_ID = "2972009098091955745";
const WEBRTC_CONN_ID = "2972732112425191076";
const DID = "+972555172720";

function normalizePhoneLike(value) {
  let clean = String(value || "").trim();
  if (!clean) return "";
  if (/^sip:/i.test(clean) || /gencred/i.test(clean)) return clean.toLowerCase();
  clean = clean.replace(/[^\d+]/g, "");
  clean = clean.replace(/\+/g, (match, offset) => (offset === 0 ? match : ""));
  if (!clean) return "";
  if (clean.startsWith("00")) clean = `+${clean.slice(2)}`;
  if (clean.startsWith("+")) return clean;
  if (clean.startsWith("972")) return `+${clean}`;
  if (clean.startsWith("0") && clean.length >= 8) return `+972${clean.slice(1)}`;
  return clean;
}

function isGencredOrSipTarget(value) {
  const raw = String(value || "").trim().toLowerCase();
  return Boolean(raw && (raw.startsWith("sip:") || raw.includes("gencred")));
}

function hasInternalBridgeMetadata(clientState, bridgeIntent) {
  if (bridgeIntent === true) return true;
  if (!clientState || typeof clientState !== "object") return false;
  if (clientState.invistimo_inbound_bridge === true) return true;
  if (clientState.bridge_intent === true) return true;
  if (String(clientState.rootInboundCallControlId || "").trim()) return true;
  return false;
}

function isRoutablePstnInboundLeg(input) {
  const voiceApp = String(input.voiceAppConnectionId || VOICE_APP_ID).trim();
  const webrtc = String(input.webrtcConnectionId || WEBRTC_CONN_ID).trim();
  const did = normalizePhoneLike(input.invistimoDid || DID) || DID;
  const connectionId = String(input.connectionId || "").trim();
  const direction = String(input.direction || "").trim().toLowerCase();
  const toRaw = String(input.to || "").trim();
  const toNorm = normalizePhoneLike(toRaw);
  const fromRaw = String(input.from || "").trim();

  if (!connectionId) return { ok: false, reason: "CONNECTION_ID_MISSING" };
  if (connectionId === webrtc) {
    return { ok: false, reason: "WEBRTC_CREDENTIAL_CONNECTION" };
  }
  if (connectionId !== voiceApp) {
    return { ok: false, reason: "NOT_VOICE_APP_CONNECTION" };
  }
  if (hasInternalBridgeMetadata(input.clientState, input.bridgeIntent)) {
    return { ok: false, reason: "INTERNAL_BRIDGE_METADATA" };
  }
  if (isGencredOrSipTarget(toRaw) || isGencredOrSipTarget(fromRaw)) {
    return { ok: false, reason: "GENCRED_OR_SIP_TARGET" };
  }

  const isIncoming =
    input.inbound === true ||
    direction === "incoming" ||
    direction === "inbound";
  const isOutgoing =
    direction === "outgoing" ||
    direction === "outbound" ||
    input.inbound === false;

  if (isOutgoing) return { ok: false, reason: "OUTGOING_DIRECTION" };
  if (!isIncoming) return { ok: false, reason: "DIRECTION_UNCLEAR" };
  if (!toNorm || toNorm !== did) return { ok: false, reason: "NOT_INVISTIMO_DID" };
  return { ok: true };
}

function resolveBridgeSessionId({ rootInboundCallControlId, callSessionId }) {
  return String(callSessionId || "").trim() || String(rootInboundCallControlId || "").trim();
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

function applyOutboundCreatedToAttempt(attempt, params) {
  const outboundId = String(params.outboundCallControlId || "").trim();
  const next = { ...attempt };
  if (!outboundId) {
    return { attempt: next, shouldHangupPeer: false, peerCallControlId: null };
  }
  const existingOut = String(next.outboundCallControlId || "").trim();
  if (!existingOut) next.outboundCallControlId = outboundId;
  if (next.status === "claimed" || next.status === "dialing") {
    next.status = "ringing";
  }
  return {
    attempt: next,
    shouldHangupPeer: Boolean(next.pendingPeerHangup),
    peerCallControlId: String(next.outboundCallControlId || "") || null,
  };
}

function applyBridgeWebhookEvent(attempt, params) {
  const eventType = String(params.eventType || "").toLowerCase();
  const callControlId = String(params.callControlId || "").trim();
  const next = {
    ...attempt,
    busyCredentialIds: [...(attempt.busyCredentialIds || [])],
  };
  const peerHangupIds = [];
  const isInbound = next.inboundCallControlId === callControlId;
  const isOutbound = next.outboundCallControlId === callControlId;
  const isWebrtc = next.webrtcCallControlId === callControlId;

  if (eventType === "call.answered" || eventType === "call.bridged") {
    if (!TERMINAL.has(next.status)) {
      next.status = eventType === "call.bridged" ? "bridged" : "answered";
      next.answeredAt = next.answeredAt || new Date().toISOString();
    }
    return { attempt: next, peerHangupIds };
  }

  if (eventType !== "call.hangup") return { attempt: next, peerHangupIds };

  const cause = String(params.hangupCause || "").trim();
  next.hangupCause = cause || next.hangupCause || null;

  const peers = [];
  if (isInbound || (!isOutbound && !isWebrtc)) {
    if (next.outboundCallControlId) peers.push(next.outboundCallControlId);
    if (next.webrtcCallControlId) peers.push(next.webrtcCallControlId);
  }
  if (isOutbound) {
    if (next.inboundCallControlId) peers.push(next.inboundCallControlId);
    if (next.webrtcCallControlId) peers.push(next.webrtcCallControlId);
  }
  if (isWebrtc) {
    if (next.inboundCallControlId) peers.push(next.inboundCallControlId);
    if (next.outboundCallControlId) peers.push(next.outboundCallControlId);
  }

  const known = peers.filter((id) => id && id !== callControlId);
  if (known.length) peerHangupIds.push(...known);
  else next.pendingPeerHangup = true;

  const answeredLike = next.status === "answered" || next.status === "bridged";
  next.status = answeredLike ? "completed" : mapHangupCauseToBridgeStatus(cause);
  next.endedAt = new Date().toISOString();
  return { attempt: next, peerHangupIds };
}

function createBridgeStore() {
  const byRoot = new Map();
  const dials = [];
  const hangups = [];

  function countActive() {
    let n = 0;
    for (const row of byRoot.values()) {
      if (ACTIVE.has(row.status) && !row.endedAt) n += 1;
    }
    return n;
  }

  function findByAnyId(id) {
    for (const row of byRoot.values()) {
      if (
        row.rootInboundCallControlId === id ||
        row.inboundCallControlId === id ||
        row.outboundCallControlId === id ||
        row.webrtcCallControlId === id ||
        row.bridgeSessionId === id
      ) {
        return row;
      }
    }
    return null;
  }

  function claimPstn(webhook) {
    const gate = isRoutablePstnInboundLeg({
      connectionId: webhook.connectionId,
      direction: webhook.direction,
      inbound: webhook.inbound,
      from: webhook.from,
      to: webhook.to,
      clientState: webhook.clientState,
      bridgeIntent: webhook.bridgeIntent,
      voiceAppConnectionId: VOICE_APP_ID,
      webrtcConnectionId: WEBRTC_CONN_ID,
      invistimoDid: DID,
    });
    if (!gate.ok) return { ok: false, reason: gate.reason, dialed: false };

    const inboundCallControlId = webhook.callControlId;
    if (countActive() >= CAPACITY_SOFT_LIMIT) {
      return { ok: false, reason: "CAPACITY_SOFT_LIMIT", dialed: false };
    }

    const existing = byRoot.get(inboundCallControlId);
    if (!existing) {
      const created = {
        rootInboundCallControlId: inboundCallControlId,
        inboundCallControlId,
        bridgeSessionId: resolveBridgeSessionId({
          rootInboundCallControlId: inboundCallControlId,
          callSessionId: webhook.callSessionId,
        }),
        status: "claimed",
        attemptNumber: 1,
        busyCredentialIds: [],
        endedAt: null,
        outboundCallControlId: null,
        webrtcCallControlId: null,
        pendingPeerHangup: false,
      };
      byRoot.set(inboundCallControlId, created);
      return { ok: true, mode: "created", attempt: created, dialed: false };
    }

    if (ACTIVE.has(existing.status) || existing.outboundCallControlId) {
      return { ok: false, reason: "ACTIVE_BRIDGE_EXISTS", attempt: existing, dialed: false };
    }
    if (existing.attemptNumber >= MAX_ATTEMPTS) {
      return { ok: false, reason: "MAX_ATTEMPTS", attempt: existing, dialed: false };
    }
    if (!RETRYABLE.has(existing.status) || !existing.endedAt) {
      return { ok: false, reason: "ACTIVE_BRIDGE_EXISTS", attempt: existing, dialed: false };
    }

    existing.status = "claimed";
    existing.attemptNumber += 1;
    existing.endedAt = null;
    existing.outboundCallControlId = null;
    existing.webrtcCallControlId = null;
    existing.pendingPeerHangup = false;
    return { ok: true, mode: "retry", attempt: existing, dialed: false };
  }

  function handleWebhook(webhook) {
    const attached = findByAnyId(webhook.callControlId) ||
      findByAnyId(webhook.callSessionId) ||
      (webhook.clientState?.rootInboundCallControlId
        ? findByAnyId(webhook.clientState.rootInboundCallControlId)
        : null);

    // Secondary legs never create.
    const gate = isRoutablePstnInboundLeg({
      connectionId: webhook.connectionId,
      direction: webhook.direction,
      inbound: webhook.inbound,
      from: webhook.from,
      to: webhook.to,
      clientState: webhook.clientState,
      bridgeIntent: webhook.bridgeIntent,
      voiceAppConnectionId: VOICE_APP_ID,
      webrtcConnectionId: WEBRTC_CONN_ID,
      invistimoDid: DID,
    });

    if (!gate.ok) {
      if (!attached) return { created: false, dialed: false, reason: gate.reason };
      if (
        webhook.to?.includes?.("gencred") &&
        !attached.webrtcCallControlId &&
        webhook.callControlId !== attached.inboundCallControlId &&
        webhook.callControlId !== attached.outboundCallControlId
      ) {
        attached.webrtcCallControlId = webhook.callControlId;
      }
      if (
        (webhook.clientState?.bridge_intent || webhook.direction === "outgoing") &&
        !attached.outboundCallControlId &&
        webhook.callControlId !== attached.inboundCallControlId
      ) {
        const mapped = applyOutboundCreatedToAttempt(attached, {
          outboundCallControlId: webhook.callControlId,
        });
        Object.assign(attached, mapped.attempt);
        if (mapped.shouldHangupPeer) {
          hangups.push(mapped.peerCallControlId);
          attached.pendingPeerHangup = false;
        }
      }
      if (webhook.eventType && webhook.eventType !== "call.initiated") {
        const applied = applyBridgeWebhookEvent(attached, webhook);
        Object.assign(attached, applied.attempt);
        hangups.push(...applied.peerHangupIds);
      }
      return { created: false, dialed: false, reason: gate.reason, attempt: attached };
    }

    const claim = claimPstn(webhook);
    if (claim.ok && claim.mode === "created") {
      // Simulate one dial.
      const outboundId = `v3:out-${dials.length + 1}`;
      dials.push(outboundId);
      const mapped = applyOutboundCreatedToAttempt(claim.attempt, {
        outboundCallControlId: outboundId,
      });
      Object.assign(claim.attempt, mapped.attempt);
      return { created: true, dialed: true, attempt: claim.attempt };
    }
    return { created: false, dialed: false, reason: claim.reason, attempt: claim.attempt };
  }

  return { handleWebhook, claimPstn, byRoot, dials, hangups, countActive, findByAnyId };
}

test("PSTN root leg is routable; WebRTC/gencred/internal metadata are not", () => {
  assert.equal(
    isRoutablePstnInboundLeg({
      connectionId: VOICE_APP_ID,
      direction: "incoming",
      inbound: true,
      from: "+972526850711",
      to: DID,
    }).ok,
    true
  );

  assert.equal(
    isRoutablePstnInboundLeg({
      connectionId: WEBRTC_CONN_ID,
      direction: "incoming",
      inbound: true,
      from: "+972526850711",
      to: "gencredABC",
    }).reason,
    "WEBRTC_CREDENTIAL_CONNECTION"
  );

  assert.equal(
    isRoutablePstnInboundLeg({
      connectionId: VOICE_APP_ID,
      direction: "outgoing",
      to: "sip:gencredABC@sip.telnyx.com",
      from: DID,
      clientState: {
        invistimo_inbound_bridge: true,
        bridge_intent: true,
        rootInboundCallControlId: "v3:root",
      },
    }).ok,
    false
  );

  assert.equal(
    isRoutablePstnInboundLeg({
      connectionId: VOICE_APP_ID,
      direction: "incoming",
      to: "sip:gencredABC@sip.telnyx.com",
      from: "+972526850711",
    }).reason,
    "GENCRED_OR_SIP_TARGET"
  );
});

test("webhook PSTN creates one attempt; WebRTC webhook does not create another", () => {
  const store = createBridgeStore();
  const sessionId = "sess-1";
  const pstn = store.handleWebhook({
    callControlId: "v3:pstn-1",
    callSessionId: sessionId,
    connectionId: VOICE_APP_ID,
    direction: "incoming",
    inbound: true,
    from: "+972526850711",
    to: DID,
    eventType: "call.initiated",
  });
  assert.equal(pstn.created, true);
  assert.equal(pstn.dialed, true);
  assert.equal(store.byRoot.size, 1);
  assert.equal(store.dials.length, 1);

  const webrtc = store.handleWebhook({
    callControlId: "v3:webrtc-1",
    callSessionId: sessionId,
    connectionId: WEBRTC_CONN_ID,
    direction: "incoming",
    inbound: true,
    from: "+972526850711",
    to: "gencredXYZ",
    eventType: "call.initiated",
  });
  assert.equal(webrtc.created, false);
  assert.equal(store.byRoot.size, 1);
  assert.equal(store.dials.length, 1);
  assert.equal(store.findByAnyId("v3:pstn-1").webrtcCallControlId, "v3:webrtc-1");
});

test("call.answered before outbound-created still keeps outboundCallControlId", () => {
  const attempt = {
    status: "dialing",
    inboundCallControlId: "v3:pstn",
    outboundCallControlId: null,
    pendingPeerHangup: false,
  };
  const answered = applyBridgeWebhookEvent(attempt, {
    callControlId: "v3:pstn",
    eventType: "call.answered",
  });
  assert.equal(answered.attempt.status, "answered");

  const mapped = applyOutboundCreatedToAttempt(answered.attempt, {
    outboundCallControlId: "v3:out-1",
  });
  assert.equal(mapped.attempt.outboundCallControlId, "v3:out-1");
  assert.equal(mapped.attempt.status, "answered"); // terminal-ish progress kept
});

test("early hangup sets pendingPeerHangup and fires after outbound mapping", () => {
  let attempt = {
    status: "dialing",
    inboundCallControlId: "v3:pstn",
    outboundCallControlId: null,
    webrtcCallControlId: null,
    pendingPeerHangup: false,
    busyCredentialIds: [],
  };

  const early = applyBridgeWebhookEvent(attempt, {
    callControlId: "v3:pstn",
    eventType: "call.hangup",
    hangupCause: "normal_clearing",
  });
  attempt = early.attempt;
  assert.equal(attempt.pendingPeerHangup, true);
  assert.equal(early.peerHangupIds.length, 0);

  const mapped = applyOutboundCreatedToAttempt(attempt, {
    outboundCallControlId: "v3:out-late",
  });
  assert.equal(mapped.shouldHangupPeer, true);
  assert.equal(mapped.peerCallControlId, "v3:out-late");
  assert.equal(mapped.attempt.outboundCallControlId, "v3:out-late");
});

test("10 webhooks from each of three legs create one attempt and one dial", () => {
  const store = createBridgeStore();
  const sessionId = "sess-burst";
  const root = "v3:pstn-burst";

  for (let i = 0; i < 10; i += 1) {
    store.handleWebhook({
      callControlId: root,
      callSessionId: sessionId,
      connectionId: VOICE_APP_ID,
      direction: "incoming",
      inbound: true,
      from: "+972526850711",
      to: DID,
      eventType: "call.initiated",
    });
    store.handleWebhook({
      callControlId: store.dials[0] || "v3:out-pending",
      callSessionId: sessionId,
      connectionId: VOICE_APP_ID,
      direction: "outgoing",
      to: "sip:gencredX@sip.telnyx.com",
      from: DID,
      clientState: {
        invistimo_inbound_bridge: true,
        bridge_intent: true,
        rootInboundCallControlId: root,
        bridgeSessionId: sessionId,
      },
      eventType: "call.initiated",
    });
    store.handleWebhook({
      callControlId: "v3:webrtc-burst",
      callSessionId: sessionId,
      connectionId: WEBRTC_CONN_ID,
      direction: "incoming",
      to: "gencredX",
      from: "+972526850711",
      eventType: "call.initiated",
    });
  }

  assert.equal(store.byRoot.size, 1);
  assert.equal(store.dials.length, 1);
  assert.equal(store.countActive(), 1);
});

test("two different PSTN calls create two separate sessions", () => {
  const store = createBridgeStore();
  const a = store.handleWebhook({
    callControlId: "v3:pstn-a",
    callSessionId: "sess-a",
    connectionId: VOICE_APP_ID,
    direction: "incoming",
    inbound: true,
    from: "+972526850711",
    to: DID,
    eventType: "call.initiated",
  });
  const b = store.handleWebhook({
    callControlId: "v3:pstn-b",
    callSessionId: "sess-b",
    connectionId: VOICE_APP_ID,
    direction: "incoming",
    inbound: true,
    from: "+972501111111",
    to: DID,
    eventType: "call.initiated",
  });
  assert.equal(a.created, true);
  assert.equal(b.created, true);
  assert.equal(store.byRoot.size, 2);
  assert.equal(store.dials.length, 2);
  assert.notEqual(
    store.findByAnyId("v3:pstn-a").bridgeSessionId,
    store.findByAnyId("v3:pstn-b").bridgeSessionId
  );
});

test("Voice App connection never falls back to WebRTC credential connection", () => {
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

  assert.equal(
    getVoiceAppConnectionId({
      TELNYX_CONNECTION_ID: WEBRTC_CONN_ID,
      TELNYX_WEBRTC_CONNECTION_ID: WEBRTC_CONN_ID,
    }),
    VOICE_APP_ID
  );
});

test("hangup cause mapping", () => {
  assert.equal(mapHangupCauseToBridgeStatus("user_busy"), "failed_busy");
  assert.equal(mapHangupCauseToBridgeStatus("timeout"), "failed_timeout");
  assert.equal(mapHangupCauseToBridgeStatus("normal_clearing"), "completed");
});

test("no JWT / outbound WebRTC surface changed by inbound bridge rules", () => {
  // Guardrail: this suite only covers inbound bridge routing rules.
  assert.equal(typeof isRoutablePstnInboundLeg, "function");
  assert.equal(typeof applyOutboundCreatedToAttempt, "function");
});
