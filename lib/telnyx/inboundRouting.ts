import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import SoftphoneWorkSession from "@/models/SoftphoneWorkSession";
import TelnyxWebRtcCredential from "@/models/TelnyxWebRtcCredential";
import { isSoftphoneWebrtcEnabled } from "@/lib/telnyx/webrtcSecurity";
import {
  getSipUsernameForCredentialId,
  getTelephonyCredentialMeta,
  getConfiguredTelnyxWebRtcConnectionId,
  buildTelnyxSipUri,
  getSoftphoneCallerId,
} from "@/lib/telnyx/webrtcCredentials";
import {
  claimInboundBridgeAttempt,
  credentialBlockedByBusyHistory,
  encodeBridgeClientState,
  getActiveBridgeUserIds,
  getConfiguredInvistimoDid,
  getConfiguredWebrtcConnectionId,
  getInvistimoVoiceAppConnectionId,
  isRoutablePstnInboundLeg,
  markBridgeDialing,
  markBridgeFailed,
  markBridgeOutboundCreated,
  parseBridgeClientState,
  resolveBridgeSessionId,
  sleep,
  telnyxHangupCall,
  INBOUND_BRIDGE_RETRY_DELAY_MS,
} from "@/lib/telnyx/inboundBridgeState";

export type InboundRouteResult =
  | {
      ok: true;
      userId: string;
      credentialId: string;
      sipDestination: string;
      bridgeResult: "dial_bridge_requested" | "transfer_requested";
      transferStatus: number;
      dialConnectionId?: string | null;
    }
  | {
      ok: false;
      reason: string;
      userId?: string | null;
      credentialId?: string | null;
      sipDestination?: string | null;
      bridgeResult: "skipped" | "failed";
      errorCode?: string | null;
      errorMessage?: string | null;
      transferStatus?: number;
      dialConnectionId?: string | null;
    };

function getTelnyxApiKey() {
  return String(process.env.TELNYX_API_KEY || "").trim();
}

function getOldSharedUsername() {
  return String(process.env.TELNYX_WEBRTC_USERNAME || "").trim();
}

function getCallControlAppId() {
  // Must be Invistimo Voice App (Call Control) — never WebRTC Credential Connection.
  return getInvistimoVoiceAppConnectionId();
}

const PRESENCE_MAX_AGE_MS = 5 * 60 * 1000;
const sipUriCallingReady = new Set<string>();

function isFreshLastSeen(lastSeenRaw: unknown, nowMs = Date.now()) {
  if (!lastSeenRaw) return false;
  const lastSeenAt =
    lastSeenRaw instanceof Date
      ? lastSeenRaw
      : typeof lastSeenRaw === "string" || typeof lastSeenRaw === "number"
        ? new Date(lastSeenRaw)
        : null;
  if (!lastSeenAt || !Number.isFinite(lastSeenAt.getTime())) return false;
  return nowMs - lastSeenAt.getTime() <= PRESENCE_MAX_AGE_MS;
}

/**
 * Dialing sip:gencred...@sip.telnyx.com requires SIP URI calling on the
 * Credential Connection that owns the telephony credential (default: disabled).
 */
async function ensureSipUriCallingEnabled(connectionId: string) {
  const id = String(connectionId || "").trim();
  if (!id || sipUriCallingReady.has(id)) return { ok: true as const, skipped: true };

  const apiKey = getTelnyxApiKey();
  if (!apiKey) {
    return { ok: false as const, skipped: false, errorCode: "TELNYX_API_KEY_MISSING" };
  }

  const getRes = await fetch(
    `https://api.telnyx.com/v2/credential_connections/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  ).catch(() => null);

  if (!getRes) {
    return { ok: false as const, skipped: false, errorCode: "TELNYX_CONNECTION_GET_FAILED" };
  }

  const getData = await getRes.json().catch(() => null);
  if (!getRes.ok) {
    // Not a credential connection (e.g. Call Control App) — nothing to enable.
    console.warn("SIP URI CALLING CHECK SKIPPED", {
      connectionId: id,
      status: getRes.status,
    });
    sipUriCallingReady.add(id);
    return { ok: true as const, skipped: true };
  }

  const current = String(
    getData?.data?.sip_uri_calling_preference || "disabled"
  ).toLowerCase();

  if (current === "internal" || current === "unrestricted") {
    sipUriCallingReady.add(id);
    console.log("SIP URI CALLING ALREADY ENABLED", {
      connectionId: id,
      preference: current,
    });
    return { ok: true as const, skipped: true, preference: current };
  }

  const patchRes = await fetch(
    `https://api.telnyx.com/v2/credential_connections/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sip_uri_calling_preference: "internal",
      }),
      cache: "no-store",
    }
  ).catch(() => null);

  if (!patchRes || !patchRes.ok) {
    const err = patchRes ? await patchRes.json().catch(() => null) : null;
    console.error("SIP URI CALLING ENABLE FAILED", {
      connectionId: id,
      status: patchRes?.status || null,
      error: err?.errors?.[0]?.detail || err?.errors?.[0]?.title || null,
    });
    return { ok: false as const, skipped: false, errorCode: "SIP_URI_CALLING_ENABLE_FAILED" };
  }

  sipUriCallingReady.add(id);
  console.log("SIP URI CALLING ENABLED", {
    connectionId: id,
    preference: "internal",
  });
  return { ok: true as const, skipped: false, preference: "internal" };
}

async function answerInboundCall(callControlId: string) {
  const apiKey = getTelnyxApiKey();
  if (!apiKey || !callControlId) return { ok: false as const };

  const res = await fetch(
    `https://api.telnyx.com/v2/calls/${encodeURIComponent(
      callControlId
    )}/actions/answer`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    }
  ).catch(() => null);

  return { ok: Boolean(res?.ok) };
}

/**
 * Transfer the existing inbound Call Control leg to the agent's SIP URI.
 * This uses the inbound call's own connection (no new dial connection_id).
 */
async function transferCallToSip(callControlId: string, sipUri: string) {
  const apiKey = getTelnyxApiKey();
  if (!apiKey) {
    return {
      ok: false as const,
      status: 500,
      errorCode: "TELNYX_API_KEY_MISSING",
      errorMessage: "TELNYX_API_KEY_MISSING",
      method: "transfer" as const,
    };
  }

  const res = await fetch(
    `https://api.telnyx.com/v2/calls/${encodeURIComponent(
      callControlId
    )}/actions/transfer`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: sipUri,
        timeout_secs: 45,
      }),
      cache: "no-store",
    }
  );

  const data = await res.json().catch(() => null);
  const firstError = Array.isArray(data?.errors) ? data.errors[0] : null;

  if (!res.ok) {
    return {
      ok: false as const,
      status: res.status,
      errorCode: String(firstError?.code || "TELNYX_TRANSFER_FAILED"),
      errorMessage: String(
        firstError?.detail || firstError?.title || "TELNYX_TRANSFER_FAILED"
      ),
      method: "transfer" as const,
      dialCallControlId: null as string | null,
    };
  }

  return {
    ok: true as const,
    status: res.status,
    errorCode: null,
    errorMessage: null,
    method: "transfer" as const,
    dialCallControlId: null as string | null,
  };
}

/**
 * Optional dial+bridge via an explicit Call Control App id.
 * Credential Connection ids (WebRTC) are rejected by Telnyx with error 10015.
 */
async function dialBridgeToSip(params: {
  inboundCallControlId: string;
  sipUri: string;
  fromNumber: string;
  connectionId: string;
  bridgeSessionId: string;
  callLegId?: string | null;
}) {
  const apiKey = getTelnyxApiKey();
  if (!apiKey) {
    return {
      ok: false as const,
      status: 500,
      errorCode: "TELNYX_API_KEY_MISSING",
      errorMessage: "TELNYX_API_KEY_MISSING",
      method: "dial_bridge" as const,
      dialCallControlId: null as string | null,
    };
  }

  if (!params.connectionId) {
    return {
      ok: false as const,
      status: 500,
      errorCode: "CALL_CONTROL_APP_ID_MISSING",
      errorMessage: "CALL_CONTROL_APP_ID_MISSING",
      method: "dial_bridge" as const,
      dialCallControlId: null as string | null,
    };
  }

  const res = await fetch("https://api.telnyx.com/v2/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      connection_id: params.connectionId,
      to: params.sipUri,
      from: params.fromNumber,
      link_to: params.inboundCallControlId,
      bridge_intent: true,
      timeout_secs: 45,
      // Marks this dial as an internal bridge leg so webhooks never re-route it.
      client_state: encodeBridgeClientState({
        invistimo_inbound_bridge: true,
        bridge_intent: true,
        rootInboundCallControlId: params.inboundCallControlId,
        bridgeSessionId: params.bridgeSessionId,
      }),
    }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  const firstError = Array.isArray(data?.errors) ? data.errors[0] : null;

  if (!res.ok) {
    return {
      ok: false as const,
      status: res.status,
      errorCode: String(firstError?.code || "TELNYX_DIAL_BRIDGE_FAILED"),
      errorMessage: String(
        firstError?.detail || firstError?.title || "TELNYX_DIAL_BRIDGE_FAILED"
      ),
      method: "dial_bridge" as const,
      dialCallControlId: null as string | null,
    };
  }

  return {
    ok: true as const,
    status: res.status,
    errorCode: null,
    errorMessage: null,
    method: "dial_bridge" as const,
    dialCallControlId: String(data?.data?.call_control_id || "") || null,
  };
}

async function rejectInboundCall(callControlId: string) {
  const apiKey = getTelnyxApiKey();
  if (!apiKey || !callControlId) return;

  const rejectRes = await fetch(
    `https://api.telnyx.com/v2/calls/${encodeURIComponent(
      callControlId
    )}/actions/reject`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ cause: "call_rejected" }),
      cache: "no-store",
    }
  ).catch(() => null);

  if (rejectRes && rejectRes.ok) return;

  await fetch(
    `https://api.telnyx.com/v2/calls/${encodeURIComponent(
      callControlId
    )}/actions/hangup`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    }
  ).catch(() => null);
}

/**
 * Pick one available softphone agent that has an active per-user telephony credential.
 *
 * Softphone UI writes live presence to collection `softphonestatuses`:
 * - rawAgentStatus: "available"
 * - status / softphoneStatus: "online" (admin mapping)
 *
 * Never falls back to TELNYX_WEBRTC_USERNAME / shared credential.
 */
export async function findAvailableInboundSoftphoneTarget(options?: {
  excludeUserIds?: Set<string>;
  excludeCredentialIds?: string[];
}) {
  await connectDB();

  const excludeUserIds =
    options?.excludeUserIds || (await getActiveBridgeUserIds());
  const excludeCredentialIds = new Set(
    (options?.excludeCredentialIds || []).map(String).filter(Boolean)
  );

  /*
    Softphone live-status mapping (adminStatus):
    - available  -> online
    - after_call -> busy
    - in_call / dialing / ringing -> in_call / dialing / ringing
    - break / unavailable / offline -> break / not_available / offline

    After an outbound hangup the UI often stays on after_call/busy for a while.
    Those agents must still receive inbound calls.
    Agents with an active inbound bridge are not "available".
  */
  type SoftphonePresenceCandidate = {
    _id?: unknown;
    userId?: unknown;
    agentId?: unknown;
    employeeId?: unknown;
    staffId?: unknown;
    rawAgentStatus?: unknown;
    status?: unknown;
    softphoneStatus?: unknown;
    availabilityStatus?: unknown;
    lastSeenAt?: unknown;
    statusStartedAt?: unknown;
  };

  const freshSince = new Date(Date.now() - PRESENCE_MAX_AGE_MS);

  // Fresh presence only — stale after_call rows must NOT block open-shift fallback.
  let candidateAgents: SoftphonePresenceCandidate[] = await mongoose.connection
    .collection("softphonestatuses")
    .find({
      lastSeenAt: { $gte: freshSince },
      $and: [
        {
          $or: [
            { rawAgentStatus: { $in: ["available", "after_call"] } },
            { status: { $in: ["online", "busy"] } },
            { softphoneStatus: { $in: ["online", "busy"] } },
            { availabilityStatus: { $in: ["online", "busy"] } },
          ],
        },
        {
          rawAgentStatus: {
            $nin: ["offline", "unavailable", "in_call", "dialing", "ringing"],
          },
        },
      ],
    })
    .sort({ statusStartedAt: 1, lastSeenAt: -1 })
    .limit(40)
    .toArray();

  // Always merge open softphone shifts (primary signal that an agent is on duty).
  const openSessions = await SoftphoneWorkSession.find({ status: "open" })
    .select("employeeId employeeIdString")
    .limit(25)
    .lean();

  const openUserIds = openSessions
    .map((session) =>
      String(session.employeeId || session.employeeIdString || "")
    )
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  const seenUserIds = new Set(
    candidateAgents
      .map((agent) =>
        String(
          agent.userId || agent.agentId || agent.employeeId || agent.staffId || ""
        )
      )
      .filter(Boolean)
  );

  if (openUserIds.length) {
    const openPresence = await mongoose.connection
      .collection("softphonestatuses")
      .find({
        lastSeenAt: { $gte: freshSince },
        $or: [
          { userId: { $in: openUserIds } },
          { agentId: { $in: openUserIds } },
          { employeeId: { $in: openUserIds } },
          { staffId: { $in: openUserIds } },
        ],
        rawAgentStatus: {
          $nin: ["offline", "unavailable", "in_call", "dialing", "ringing"],
        },
      })
      .sort({ lastSeenAt: -1 })
      .limit(25)
      .toArray();

    for (const agent of openPresence) {
      const userId = String(
        agent.userId || agent.agentId || agent.employeeId || agent.staffId || ""
      );
      if (!userId || seenUserIds.has(userId)) continue;
      seenUserIds.add(userId);
      candidateAgents.push(agent);
    }

    // Open shift with no/missing live-status row — still try active credentials.
    for (const userId of openUserIds) {
      if (seenUserIds.has(userId)) continue;
      seenUserIds.add(userId);
      candidateAgents.push({
        userId,
        agentId: userId,
        employeeId: userId,
        rawAgentStatus: "available",
        status: "online",
        lastSeenAt: new Date(),
      });
    }
  }

  // Prefer truly available agents before after_call/busy.
  const availableAgents = [...candidateAgents].sort((a, b) => {
    const rank = (agent: any) => {
      const raw = String(agent.rawAgentStatus || "").toLowerCase();
      const status = String(agent.status || "").toLowerCase();
      if (raw === "available" || status === "online") return 0;
      if (raw === "after_call" || status === "busy") return 1;
      return 2;
    };
    return rank(a) - rank(b);
  });

  console.log("INBOUND SOFTPHONE AGENT SCAN:", {
    availableCount: availableAgents.length,
    openShiftCount: openUserIds.length,
    sample: availableAgents.slice(0, 5).map((agent) => ({
      userId: String(
        agent.userId || agent.agentId || agent.employeeId || agent.staffId || ""
      ),
      rawAgentStatus: agent.rawAgentStatus || null,
      status: agent.status || null,
      lastSeenAt: agent.lastSeenAt || null,
    })),
  });

  for (const agent of availableAgents) {
    const userId = String(
      agent.userId || agent.agentId || agent.employeeId || agent.staffId || ""
    );
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) continue;

    if (excludeUserIds.has(userId)) {
      console.log("INBOUND SOFTPHONE AGENT SKIPPED: ACTIVE_BRIDGE", { userId });
      continue;
    }

    // Synthesized open-shift candidates may not have lastSeenAt from DB.
    if (agent.lastSeenAt && !isFreshLastSeen(agent.lastSeenAt)) {
      continue;
    }

    const credentials = await TelnyxWebRtcCredential.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!credentials.length) {
      console.log("INBOUND SOFTPHONE AGENT SKIPPED: NO_ACTIVE_CREDENTIAL", {
        userId,
      });
      continue;
    }

    const credential = credentials[0];
    const credentialId = String(credential.telnyxCredentialId || "");
    if (!credentialId) continue;

    if (excludeCredentialIds.has(credentialId)) {
      console.log("INBOUND SOFTPHONE AGENT SKIPPED: CREDENTIAL_USER_BUSY", {
        userId,
        credentialId,
      });
      continue;
    }

    const meta = await getTelephonyCredentialMeta(credentialId);
    const sipUsername =
      (credential as any).sipUsername ||
      meta.sipUsername ||
      (await getSipUsernameForCredentialId(credentialId));

    if (!sipUsername) {
      console.log("INBOUND SOFTPHONE AGENT SKIPPED: NO_SIP_USERNAME", {
        userId,
        credentialId,
      });
      continue;
    }

    const oldShared = getOldSharedUsername();
    if (oldShared && sipUsername === oldShared) {
      console.error("INBOUND ROUTE REJECTED OLD SHARED USERNAME", {
        userId,
        credentialIdPrefix: credentialId.slice(0, 8),
      });
      continue;
    }

    if (!(credential as any).sipUsername && sipUsername) {
      await TelnyxWebRtcCredential.updateOne(
        { _id: credential._id },
        { $set: { sipUsername } }
      );
    }

    const dialConnectionId =
      meta.connectionId || getConfiguredTelnyxWebRtcConnectionId();

    return {
      userId,
      credentialId,
      sipUsername,
      sipDestination: buildTelnyxSipUri(sipUsername),
      dialConnectionId,
      duplicateActiveCredentials: credentials.length > 1,
    };
  }

  return null;
}

export async function routeInboundCallToSoftphone(params: {
  callControlId: string;
  from?: string;
  to?: string;
  callLegId?: string;
  callSessionId?: string;
  inboundConnectionId?: string;
  direction?: string;
  inbound?: boolean;
  clientState?: unknown;
  bridgeIntent?: boolean;
}): Promise<InboundRouteResult> {
  const { callControlId } = params;

  if (!isSoftphoneWebrtcEnabled()) {
    return {
      ok: false,
      reason: "SOFTPHONE_DISABLED",
      bridgeResult: "skipped",
    };
  }

  if (!callControlId) {
    return {
      ok: false,
      reason: "CALL_CONTROL_ID_MISSING",
      bridgeResult: "skipped",
    };
  }

  const clientState =
    typeof params.clientState === "string"
      ? parseBridgeClientState(params.clientState)
      : params.clientState && typeof params.clientState === "object"
        ? (params.clientState as any)
        : parseBridgeClientState(null);

  const pstnGate = isRoutablePstnInboundLeg({
    connectionId: params.inboundConnectionId,
    direction: params.direction,
    inbound: params.inbound,
    from: params.from,
    to: params.to,
    clientState,
    bridgeIntent: params.bridgeIntent,
    voiceAppConnectionId: getInvistimoVoiceAppConnectionId(),
    webrtcConnectionId: getConfiguredWebrtcConnectionId({
      TELNYX_WEBRTC_CONNECTION_ID: process.env.TELNYX_WEBRTC_CONNECTION_ID,
    }),
    invistimoDid: getConfiguredInvistimoDid({
      TELNYX_FROM_NUMBER: process.env.TELNYX_FROM_NUMBER,
    }),
  });

  if (!pstnGate.ok) {
    console.log("INBOUND SOFTPHONE ROUTE SKIPPED: NOT_PSTN_ROOT", {
      reason: pstnGate.reason,
      callControlId,
      connectionId: params.inboundConnectionId || null,
      direction: params.direction || null,
      to: params.to || null,
      from: params.from || null,
    });
    return {
      ok: false,
      reason: pstnGate.reason,
      bridgeResult: "skipped",
      errorCode: pstnGate.reason,
      errorMessage: "Not a routable PSTN root inbound leg",
    };
  }

  const lockOwner = `inbound-bridge:${callControlId}:${randomLockSuffix()}`;

  const claim = await claimInboundBridgeAttempt({
    inboundCallControlId: callControlId,
    inboundCallLegId: params.callLegId,
    inboundCallSessionId: params.callSessionId,
    inboundConnectionId: params.inboundConnectionId,
    lockOwner,
  });

  if (!claim.ok) {
    console.log("INBOUND BRIDGE CLAIM SKIPPED:", {
      inboundCallControlId: callControlId,
      reason: claim.reason,
      bridgeAttemptId: claim.attempt?.bridgeAttemptId || null,
      bridgeStatus: claim.attempt?.status || null,
      attemptNumber: claim.attempt?.attemptNumber || null,
    });

    if (claim.reason === "CAPACITY_SOFT_LIMIT") {
      await rejectInboundCall(callControlId);
      return {
        ok: false,
        reason: "CAPACITY_SOFT_LIMIT",
        bridgeResult: "skipped",
        errorCode: "CAPACITY_SOFT_LIMIT",
        errorMessage: "Inbound bridge soft capacity limit reached",
      };
    }

    // Duplicate webhook / active bridge / lock — do NOT dial again.
    return {
      ok: false,
      reason: claim.reason,
      bridgeResult: "skipped",
      errorCode: claim.reason,
      errorMessage: "Inbound bridge already claimed or not retryable",
      userId: claim.attempt?.userId || null,
      credentialId: claim.attempt?.credentialId || null,
      sipDestination: claim.attempt?.sipDestination || null,
      dialConnectionId: claim.attempt?.dialConnectionId || null,
    };
  }

  if (claim.mode === "retry") {
    await sleep(INBOUND_BRIDGE_RETRY_DELAY_MS);
  }

  const busyCredentialIds = claim.attempt.busyCredentialIds || [];
  const target = await findAvailableInboundSoftphoneTarget({
    excludeCredentialIds: busyCredentialIds,
  });

  if (!target) {
    console.log("INBOUND SOFTPHONE ROUTE:", {
      userId: null,
      credentialId: null,
      sipDestination: null,
      bridgeResult: "skipped",
      errorCode: "NO_AVAILABLE_AGENT_WITH_ACTIVE_CREDENTIAL",
      from: params.from || null,
      to: params.to || null,
      callControlId,
      inboundConnectionId: params.inboundConnectionId || null,
      bridgeAttemptId: claim.attempt.bridgeAttemptId,
      attemptNumber: claim.attempt.attemptNumber,
    });

    await markBridgeFailed({
      inboundCallControlId: callControlId,
      status: "failed",
      errorCode: "NO_AVAILABLE_AGENT_WITH_ACTIVE_CREDENTIAL",
    });
    await rejectInboundCall(callControlId);

    return {
      ok: false,
      reason: "NO_AVAILABLE_AGENT_WITH_ACTIVE_CREDENTIAL",
      userId: null,
      credentialId: null,
      sipDestination: null,
      bridgeResult: "skipped",
      errorCode: "NO_AVAILABLE_AGENT_WITH_ACTIVE_CREDENTIAL",
      errorMessage: "No available softphone agent with active telephony credential",
    };
  }

  if (credentialBlockedByBusyHistory(claim.attempt, target.credentialId)) {
    await markBridgeFailed({
      inboundCallControlId: callControlId,
      status: "failed_busy",
      errorCode: "CREDENTIAL_ALREADY_BUSY_THIS_CALL",
      credentialId: target.credentialId,
      markCredentialBusy: true,
    });
    await rejectInboundCall(callControlId);
    return {
      ok: false,
      reason: "CREDENTIAL_ALREADY_BUSY_THIS_CALL",
      userId: target.userId,
      credentialId: target.credentialId,
      sipDestination: target.sipDestination,
      bridgeResult: "failed",
      errorCode: "CREDENTIAL_ALREADY_BUSY_THIS_CALL",
    };
  }

  const oldShared = getOldSharedUsername();
  if (
    oldShared &&
    (target.sipUsername === oldShared ||
      target.sipDestination.includes(`${oldShared}@`))
  ) {
    console.error("INBOUND SOFTPHONE ROUTE BLOCKED OLD CREDENTIAL", {
      userId: target.userId,
      credentialId: target.credentialId,
      bridgeResult: "failed",
      errorCode: "OLD_SHARED_CREDENTIAL_BLOCKED",
    });

    await markBridgeFailed({
      inboundCallControlId: callControlId,
      status: "failed",
      errorCode: "OLD_SHARED_CREDENTIAL_BLOCKED",
    });

    return {
      ok: false,
      reason: "OLD_SHARED_CREDENTIAL_BLOCKED",
      userId: target.userId,
      credentialId: target.credentialId,
      sipDestination: null,
      bridgeResult: "failed",
      errorCode: "OLD_SHARED_CREDENTIAL_BLOCKED",
      errorMessage: "Refusing to route inbound to legacy shared WebRTC username",
    };
  }

  const fromNumber =
    String(params.from || "").trim() || getSoftphoneCallerId();

  // Required so Call Control can dial sip:gencred...@sip.telnyx.com.
  const sipUriReady = await ensureSipUriCallingEnabled(
    target.dialConnectionId || getConfiguredTelnyxWebRtcConnectionId()
  );
  if (!sipUriReady.ok) {
    console.warn("SIP URI CALLING NOT READY — continuing route attempt", {
      credentialConnectionId: target.dialConnectionId || null,
      errorCode: sipUriReady.errorCode || null,
    });
  }

  /*
    Voice App only (2972009098091955745):
    answer inbound leg, then ONE dial+bridge to the agent's SIP URI.
    Idempotency/lock above prevents duplicate outbound legs.
  */
  const callControlAppId = getCallControlAppId();

  await markBridgeDialing({
    inboundCallControlId: callControlId,
    userId: target.userId,
    credentialId: target.credentialId,
    sipDestination: target.sipDestination,
    dialConnectionId: callControlAppId,
  });

  await answerInboundCall(callControlId);

  const bridgeSessionId = resolveBridgeSessionId({
    rootInboundCallControlId: callControlId,
    callSessionId: params.callSessionId || claim.attempt.inboundCallSessionId,
  });

  const routeAttempt = await dialBridgeToSip({
    inboundCallControlId: callControlId,
    sipUri: target.sipDestination,
    fromNumber,
    connectionId: callControlAppId,
    bridgeSessionId,
    callLegId: params.callLegId,
  });

  console.log("INBOUND SOFTPHONE ROUTE:", {
    bridgeAttemptId: claim.attempt.bridgeAttemptId,
    inboundCallControlId: callControlId,
    outboundCallControlId: routeAttempt.dialCallControlId || null,
    userId: target.userId,
    credentialId: target.credentialId,
    sipDestination: target.sipDestination,
    attemptNumber: claim.attempt.attemptNumber,
    bridgeStatus: routeAttempt.ok ? "ringing" : "failed",
    bridgeResult: routeAttempt.ok ? "dial_bridge_requested" : "failed",
    routeMethod: "dial_bridge",
    errorCode: routeAttempt.errorCode,
    errorMessage: routeAttempt.errorMessage,
    transferStatus: routeAttempt.status,
    dialConnectionId: callControlAppId,
    credentialConnectionId: target.dialConnectionId || null,
    inboundConnectionId: params.inboundConnectionId || null,
    from: params.from || null,
    to: params.to || null,
    callLegId: params.callLegId || null,
    callSessionId: params.callSessionId || null,
    startedAt: claim.attempt.startedAt || null,
    endedAt: null,
  });

  if (!routeAttempt.ok) {
    // Free Telnyx channel — answered A-leg must not stay open after dial failure.
    await telnyxHangupCall(callControlId);

    const busy =
      routeAttempt.errorCode === "10010" ||
      String(routeAttempt.errorMessage || "")
        .toLowerCase()
        .includes("busy") ||
      String(routeAttempt.errorMessage || "")
        .toLowerCase()
        .includes("capacity");

    await markBridgeFailed({
      inboundCallControlId: callControlId,
      status: busy ? "failed_capacity" : "failed",
      errorCode: routeAttempt.errorCode,
      errorMessage: routeAttempt.errorMessage,
      hangupCause: busy ? "capacity_or_busy" : "dial_failed",
      credentialId: target.credentialId,
      markCredentialBusy: false,
    });

    return {
      ok: false,
      reason: "ROUTE_TO_SOFTPHONE_FAILED",
      userId: target.userId,
      credentialId: target.credentialId,
      sipDestination: target.sipDestination,
      bridgeResult: "failed",
      errorCode: routeAttempt.errorCode,
      errorMessage: routeAttempt.errorMessage,
      transferStatus: routeAttempt.status,
      dialConnectionId: callControlAppId,
    };
  }

  await markBridgeOutboundCreated({
    inboundCallControlId: callControlId,
    outboundCallControlId: routeAttempt.dialCallControlId || "",
    outboundCallLegId: null,
  });

  return {
    ok: true,
    userId: target.userId,
    credentialId: target.credentialId,
    sipDestination: target.sipDestination,
    bridgeResult: "dial_bridge_requested",
    transferStatus: routeAttempt.status,
    dialConnectionId: callControlAppId,
  };
}

function randomLockSuffix() {
  return Math.random().toString(36).slice(2, 10);
}
