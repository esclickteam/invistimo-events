/**
 * Pure inbound-bridge routing rules (no I/O).
 * PSTN root legs may create a bridge attempt; secondary legs only attach.
 */

export const INVISTIMO_VOICE_APP_CONNECTION_ID = "2972009098091955745";
export const INVISTIMO_WEBRTC_CONNECTION_ID_DEFAULT = "2972732112425191076";
export const INVISTIMO_DID_DEFAULT = "+972555172720";

export const INBOUND_BRIDGE_CLIENT_STATE_FLAG = "invistimo_inbound_bridge";

export type BridgeClientState = {
  invistimo_inbound_bridge?: boolean;
  bridge_intent?: boolean;
  rootInboundCallControlId?: string;
  bridgeSessionId?: string;
};

export type PstnRootLegInput = {
  connectionId?: string | null;
  direction?: string | null;
  inbound?: boolean | null;
  from?: string | null;
  to?: string | null;
  clientState?: BridgeClientState | Record<string, unknown> | null;
  bridgeIntent?: boolean | null;
  voiceAppConnectionId?: string | null;
  webrtcConnectionId?: string | null;
  invistimoDid?: string | null;
};

export type PstnRootLegResult =
  | { ok: true }
  | { ok: false; reason: string };

const TERMINAL_STATUSES = new Set([
  "failed_busy",
  "failed_rejected",
  "failed_timeout",
  "failed_canceled",
  "failed_capacity",
  "failed",
  "completed",
  "cleaned_stale",
]);

export function normalizePhoneLike(value: unknown) {
  let clean = String(value || "").trim();
  if (!clean) return "";

  // Keep SIP URIs distinguishable.
  if (/^sip:/i.test(clean) || /gencred/i.test(clean)) {
    return clean.toLowerCase();
  }

  clean = clean.replace(/[^\d+]/g, "");
  clean = clean.replace(/\+/g, (match, offset) => (offset === 0 ? match : ""));
  if (!clean) return "";
  if (clean.startsWith("00")) clean = `+${clean.slice(2)}`;
  if (clean.startsWith("+")) return clean;
  if (clean.startsWith("972")) return `+${clean}`;
  if (clean.startsWith("0") && clean.length >= 8) return `+972${clean.slice(1)}`;
  return clean;
}

export function getConfiguredVoiceAppConnectionId(env: {
  TELNYX_CALL_CONTROL_APP_ID?: string;
  TELNYX_VOICE_CONNECTION_ID?: string;
  TELNYX_CONNECTION_ID?: string;
  TELNYX_WEBRTC_CONNECTION_ID?: string;
} = {}) {
  const fromEnv = String(
    env.TELNYX_CALL_CONTROL_APP_ID ||
      env.TELNYX_VOICE_CONNECTION_ID ||
      env.TELNYX_CONNECTION_ID ||
      ""
  ).trim();
  const webrtc = String(env.TELNYX_WEBRTC_CONNECTION_ID || "").trim();
  if (fromEnv && fromEnv !== webrtc) return fromEnv;
  return INVISTIMO_VOICE_APP_CONNECTION_ID;
}

export function getConfiguredWebrtcConnectionId(env: {
  TELNYX_WEBRTC_CONNECTION_ID?: string;
} = {}) {
  return (
    String(env.TELNYX_WEBRTC_CONNECTION_ID || "").trim() ||
    INVISTIMO_WEBRTC_CONNECTION_ID_DEFAULT
  );
}

export function getConfiguredInvistimoDid(env: {
  TELNYX_FROM_NUMBER?: string;
} = {}) {
  return normalizePhoneLike(env.TELNYX_FROM_NUMBER || INVISTIMO_DID_DEFAULT);
}

export function isGencredOrSipTarget(value: unknown) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return false;
  return raw.startsWith("sip:") || raw.includes("gencred");
}

export function hasInternalBridgeMetadata(
  clientState?: BridgeClientState | Record<string, unknown> | null,
  bridgeIntent?: boolean | null
) {
  if (bridgeIntent === true) return true;
  if (!clientState || typeof clientState !== "object") return false;
  const state = clientState as BridgeClientState;
  if (state.invistimo_inbound_bridge === true) return true;
  if (state.bridge_intent === true) return true;
  if (String(state.rootInboundCallControlId || "").trim()) return true;
  return false;
}

export function resolveBridgeSessionId(params: {
  rootInboundCallControlId: string;
  callSessionId?: string | null;
}) {
  const root = String(params.rootInboundCallControlId || "").trim();
  const session = String(params.callSessionId || "").trim();
  // Prefer Telnyx call_session_id so PSTN + dial + WebRTC share one id.
  return session || root;
}

export function encodeBridgeClientState(state: BridgeClientState) {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64");
}

export function parseBridgeClientState(
  value: unknown
): BridgeClientState {
  if (typeof value !== "string" || !value.trim()) return {};
  const raw = value.trim();
  const candidates = [raw];
  try {
    candidates.push(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    // ignore
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed as BridgeClientState;
    } catch {
      // keep trying
    }
  }
  return {};
}

/**
 * Hard gate: only the original PSTN inbound leg to Invistimo DID on Voice App
 * may create/route a softphone bridge. Default deny when unclear.
 */
export function isRoutablePstnInboundLeg(
  input: PstnRootLegInput
): PstnRootLegResult {
  const voiceApp =
    String(input.voiceAppConnectionId || "").trim() ||
    INVISTIMO_VOICE_APP_CONNECTION_ID;
  const webrtc =
    String(input.webrtcConnectionId || "").trim() ||
    INVISTIMO_WEBRTC_CONNECTION_ID_DEFAULT;
  const did =
    normalizePhoneLike(input.invistimoDid || INVISTIMO_DID_DEFAULT) ||
    INVISTIMO_DID_DEFAULT;

  const connectionId = String(input.connectionId || "").trim();
  const direction = String(input.direction || "").trim().toLowerCase();
  const toRaw = String(input.to || "").trim();
  const toNorm = normalizePhoneLike(toRaw);
  const fromRaw = String(input.from || "").trim();

  if (!connectionId) {
    return { ok: false, reason: "CONNECTION_ID_MISSING" };
  }

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

  if (isOutgoing) {
    return { ok: false, reason: "OUTGOING_DIRECTION" };
  }

  if (!isIncoming) {
    // Unclear direction — default deny.
    return { ok: false, reason: "DIRECTION_UNCLEAR" };
  }

  if (!toNorm || toNorm !== did) {
    return { ok: false, reason: "NOT_INVISTIMO_DID" };
  }

  return { ok: true };
}

export function isTerminalBridgeStatus(status?: string | null) {
  return TERMINAL_STATUSES.has(String(status || ""));
}

/**
 * Pure race-safe outbound mapping:
 * - fill outboundCallControlId when null
 * - never overwrite a different outbound id
 * - never overwrite terminal status with ringing
 * - after mapping, pendingPeerHangup requests peer hangup
 */
export function applyOutboundCreatedToAttempt<
  T extends {
    status: string;
    outboundCallControlId?: string | null;
    outboundCallLegId?: string | null;
    pendingPeerHangup?: boolean | null;
  },
>(
  attempt: T,
  params: {
    outboundCallControlId: string;
    outboundCallLegId?: string | null;
  }
): {
  attempt: T;
  shouldHangupPeer: boolean;
  peerCallControlId: string | null;
  changed: boolean;
} {
  const outboundId = String(params.outboundCallControlId || "").trim();
  const outboundLegId = String(params.outboundCallLegId || "").trim() || null;
  if (!outboundId) {
    return {
      attempt,
      shouldHangupPeer: false,
      peerCallControlId: null,
      changed: false,
    };
  }

  const next = { ...attempt };
  let changed = false;

  const existingOut = String(next.outboundCallControlId || "").trim();
  if (!existingOut) {
    next.outboundCallControlId = outboundId;
    changed = true;
  } else if (existingOut !== outboundId) {
    // Do not overwrite a different mapped outbound.
    return {
      attempt: next,
      shouldHangupPeer: Boolean(next.pendingPeerHangup),
      peerCallControlId: existingOut,
      changed: false,
    };
  }

  if (outboundLegId && !String(next.outboundCallLegId || "").trim()) {
    next.outboundCallLegId = outboundLegId;
    changed = true;
  }

  if (next.status === "claimed" || next.status === "dialing") {
    next.status = "ringing";
    changed = true;
  }
  // answered / bridged / completed / failed* — keep status as-is.

  const shouldHangupPeer = Boolean(next.pendingPeerHangup);
  return {
    attempt: next,
    shouldHangupPeer,
    peerCallControlId: String(next.outboundCallControlId || "") || null,
    changed,
  };
}

/**
 * Pure webhook event application for ordering / pending peer hangup.
 */
export function applyBridgeWebhookEvent<
  T extends {
    status: string;
    inboundCallControlId?: string | null;
    outboundCallControlId?: string | null;
    webrtcCallControlId?: string | null;
    answeredAt?: string | Date | null;
    endedAt?: string | Date | null;
    hangupCause?: string | null;
    pendingPeerHangup?: boolean | null;
    pendingHangupCause?: string | null;
    busyCredentialIds?: string[];
    credentialId?: string | null;
  },
>(
  attempt: T,
  params: {
    callControlId: string;
    eventType: string;
    hangupCause?: string | null;
    now?: Date;
  }
): {
  attempt: T;
  peerHangupIds: string[];
  changed: boolean;
} {
  const eventType = String(params.eventType || "").toLowerCase();
  const callControlId = String(params.callControlId || "").trim();
  const next = {
    ...attempt,
    busyCredentialIds: [...(attempt.busyCredentialIds || [])],
  };
  let changed = false;
  const peerHangupIds: string[] = [];

  const isInbound = next.inboundCallControlId === callControlId;
  const isOutbound = next.outboundCallControlId === callControlId;
  const isWebrtc = next.webrtcCallControlId === callControlId;

  if (eventType === "call.answered" || eventType === "call.bridged") {
    if (!isTerminalBridgeStatus(next.status)) {
      const target = eventType === "call.bridged" ? "bridged" : "answered";
      if (next.status !== target) {
        next.status = target;
        changed = true;
      }
      if (!next.answeredAt) {
        next.answeredAt = params.now || new Date();
        changed = true;
      }
    }
    return { attempt: next, peerHangupIds, changed };
  }

  if (eventType !== "call.hangup") {
    return { attempt: next, peerHangupIds, changed };
  }

  const cause = String(params.hangupCause || "").trim();
  if (cause && next.hangupCause !== cause) {
    next.hangupCause = cause;
    changed = true;
  }

  const peers: string[] = [];
  if (isInbound || (!isOutbound && !isWebrtc)) {
    if (next.outboundCallControlId) peers.push(String(next.outboundCallControlId));
    if (next.webrtcCallControlId) peers.push(String(next.webrtcCallControlId));
  }
  if (isOutbound) {
    if (next.inboundCallControlId) peers.push(String(next.inboundCallControlId));
    if (next.webrtcCallControlId) peers.push(String(next.webrtcCallControlId));
  }
  if (isWebrtc) {
    if (next.inboundCallControlId) peers.push(String(next.inboundCallControlId));
    if (next.outboundCallControlId) peers.push(String(next.outboundCallControlId));
  }

  const knownPeers = peers.filter((id) => id && id !== callControlId);
  if (knownPeers.length) {
    peerHangupIds.push(...knownPeers);
  } else {
    next.pendingPeerHangup = true;
    next.pendingHangupCause = cause || next.pendingHangupCause || null;
    changed = true;
  }

  if (!isTerminalBridgeStatus(next.status) || !next.endedAt) {
    const answeredLike =
      next.status === "answered" || next.status === "bridged";
    next.status = answeredLike
      ? "completed"
      : mapHangupCauseToStatus(cause);
    next.endedAt = params.now || new Date();
    changed = true;
  }

  if (
    mapHangupCauseToStatus(cause) === "failed_busy" &&
    next.credentialId &&
    !next.busyCredentialIds.includes(next.credentialId)
  ) {
    next.busyCredentialIds.push(next.credentialId);
    changed = true;
  }

  return { attempt: next, peerHangupIds, changed };
}

export function mapHangupCauseToStatus(cause: string) {
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
