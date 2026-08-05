import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import TelnyxWebRtcCredential from "@/models/TelnyxWebRtcCredential";
import { isSoftphoneWebrtcEnabled } from "@/lib/telnyx/webrtcSecurity";
import {
  getSipUsernameForCredentialId,
  getTelephonyCredentialMeta,
  getConfiguredTelnyxWebRtcConnectionId,
  buildTelnyxSipUri,
  getSoftphoneCallerId,
} from "@/lib/telnyx/webrtcCredentials";

export type InboundRouteResult =
  | {
      ok: true;
      userId: string;
      credentialId: string;
      sipDestination: string;
      bridgeResult: "dial_bridge_requested";
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

/**
 * Ring the WebRTC endpoint on the SAME connection the telephony credential
 * is registered on, then auto-bridge to the inbound PSTN leg.
 *
 * Plain `transfer` from the inbound Call Control connection caused
 * hangupCause=user_busy because the gencred registration lives on the
 * WebRTC credential connection (often a different connection id).
 */
async function dialBridgeToSip(params: {
  inboundCallControlId: string;
  sipUri: string;
  fromNumber: string;
  connectionId: string;
}) {
  const apiKey = getTelnyxApiKey();
  if (!apiKey) {
    return {
      ok: false as const,
      status: 500,
      errorCode: "TELNYX_API_KEY_MISSING",
      errorMessage: "TELNYX_API_KEY_MISSING",
    };
  }

  if (!params.connectionId) {
    return {
      ok: false as const,
      status: 500,
      errorCode: "WEBRTC_CONNECTION_ID_MISSING",
      errorMessage: "WEBRTC_CONNECTION_ID_MISSING",
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
      dialCallControlId: null as string | null,
    };
  }

  return {
    ok: true as const,
    status: res.status,
    errorCode: null,
    errorMessage: null,
    dialCallControlId: String(data?.data?.call_control_id || "") || null,
  };
}

async function speakAndHangup(callControlId: string, text: string) {
  const apiKey = getTelnyxApiKey();
  if (!apiKey || !callControlId) return;

  await fetch(
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

  await fetch(
    `https://api.telnyx.com/v2/calls/${encodeURIComponent(
      callControlId
    )}/actions/speak`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        payload: text,
        language: process.env.TELNYX_GREETING_LANGUAGE || "he-IL",
        voice: process.env.TELNYX_GREETING_VOICE || "female",
      }),
      cache: "no-store",
    }
  ).catch(() => null);

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
export async function findAvailableInboundSoftphoneTarget() {
  await connectDB();

  const availableAgents = await mongoose.connection
    .collection("softphonestatuses")
    .find({
      $or: [
        { rawAgentStatus: "available" },
        { status: "online" },
        { softphoneStatus: "online" },
        { availabilityStatus: "online" },
      ],
    })
    .sort({ statusStartedAt: 1, lastSeenAt: -1 })
    .limit(25)
    .toArray();

  console.log("INBOUND SOFTPHONE AGENT SCAN:", {
    availableCount: availableAgents.length,
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

    // Skip stale presence (> 3 minutes without heartbeat).
    const lastSeenAt = agent.lastSeenAt ? new Date(agent.lastSeenAt) : null;
    if (
      lastSeenAt &&
      Number.isFinite(lastSeenAt.getTime()) &&
      Date.now() - lastSeenAt.getTime() > 3 * 60 * 1000
    ) {
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

  const target = await findAvailableInboundSoftphoneTarget();

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
    });

    await speakAndHangup(
      callControlId,
      process.env.TELNYX_NO_AGENT_TEXT ||
        "שלום, אין כרגע נציג זמין. אנא נסו שוב מאוחר יותר."
    );

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

  const dial = await dialBridgeToSip({
    inboundCallControlId: callControlId,
    sipUri: target.sipDestination,
    fromNumber,
    connectionId: target.dialConnectionId,
  });

  console.log("INBOUND SOFTPHONE ROUTE:", {
    userId: target.userId,
    credentialId: target.credentialId,
    sipDestination: target.sipDestination,
    bridgeResult: dial.ok ? "dial_bridge_requested" : "failed",
    errorCode: dial.errorCode,
    errorMessage: dial.errorMessage,
    transferStatus: dial.status,
    dialConnectionId: target.dialConnectionId,
    inboundConnectionId: params.inboundConnectionId || null,
    connectionMismatch:
      Boolean(params.inboundConnectionId) &&
      Boolean(target.dialConnectionId) &&
      params.inboundConnectionId !== target.dialConnectionId,
    dialCallControlId: dial.dialCallControlId || null,
    duplicateActiveCredentials: target.duplicateActiveCredentials,
    from: params.from || null,
    to: params.to || null,
    callControlId,
    callLegId: params.callLegId || null,
    callSessionId: params.callSessionId || null,
  });

  if (!dial.ok) {
    return {
      ok: false,
      reason: "DIAL_BRIDGE_FAILED",
      userId: target.userId,
      credentialId: target.credentialId,
      sipDestination: target.sipDestination,
      bridgeResult: "failed",
      errorCode: dial.errorCode,
      errorMessage: dial.errorMessage,
      transferStatus: dial.status,
      dialConnectionId: target.dialConnectionId,
    };
  }

  return {
    ok: true,
    userId: target.userId,
    credentialId: target.credentialId,
    sipDestination: target.sipDestination,
    bridgeResult: "dial_bridge_requested",
    transferStatus: dial.status,
    dialConnectionId: target.dialConnectionId,
  };
}
