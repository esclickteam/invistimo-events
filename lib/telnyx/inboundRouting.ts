import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import SoftphoneAgentStatus from "@/models/SoftphoneAgentStatus";
import TelnyxWebRtcCredential from "@/models/TelnyxWebRtcCredential";
import { isSoftphoneWebrtcEnabled } from "@/lib/telnyx/webrtcSecurity";
import {
  getSipUsernameForCredentialId,
  buildTelnyxSipUri,
} from "@/lib/telnyx/webrtcCredentials";

export type InboundRouteResult =
  | {
      ok: true;
      userId: string;
      credentialId: string;
      sipDestination: string;
      bridgeResult: "transfer_requested";
      transferStatus: number;
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
    };

function getTelnyxApiKey() {
  return String(process.env.TELNYX_API_KEY || "").trim();
}

function getOldSharedUsername() {
  return String(process.env.TELNYX_WEBRTC_USERNAME || "").trim();
}

async function transferCallToSip(callControlId: string, sipUri: string) {
  const apiKey = getTelnyxApiKey();
  if (!apiKey) {
    return {
      ok: false as const,
      status: 500,
      errorCode: "TELNYX_API_KEY_MISSING",
      errorMessage: "TELNYX_API_KEY_MISSING",
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
    };
  }

  return {
    ok: true as const,
    status: res.status,
    errorCode: null,
    errorMessage: null,
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
 * Never falls back to TELNYX_WEBRTC_USERNAME / shared credential.
 */
export async function findAvailableInboundSoftphoneTarget() {
  await connectDB();

  const availableAgents = await SoftphoneAgentStatus.find({
    status: "available",
  })
    .sort({ statusStartedAt: 1, lastSeenAt: -1 })
    .select("agentId status statusStartedAt lastSeenAt")
    .lean();

  for (const agent of availableAgents) {
    const userId = String(agent.agentId || "");
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) continue;

    const credentials = await TelnyxWebRtcCredential.find({
      userId,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!credentials.length) continue;

    // Prefer newest active credential; ignore duplicates beyond the first.
    const credential = credentials[0];
    const credentialId = String(credential.telnyxCredentialId || "");
    if (!credentialId) continue;

    const sipUsername =
      (credential as any).sipUsername ||
      (await getSipUsernameForCredentialId(credentialId));

    if (!sipUsername) continue;

    const oldShared = getOldSharedUsername();
    if (oldShared && sipUsername === oldShared) {
      console.error("INBOUND ROUTE REJECTED OLD SHARED USERNAME", {
        userId,
        credentialIdPrefix: credentialId.slice(0, 8),
      });
      continue;
    }

    // Backfill sipUsername if missing in DB (never store password).
    if (!(credential as any).sipUsername && sipUsername) {
      await TelnyxWebRtcCredential.updateOne(
        { _id: credential._id },
        { $set: { sipUsername } }
      );
    }

    return {
      userId,
      credentialId,
      sipUsername,
      sipDestination: buildTelnyxSipUri(sipUsername),
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

  // Hard ban: never route to old shared username.
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

  const transfer = await transferCallToSip(
    callControlId,
    target.sipDestination
  );

  console.log("INBOUND SOFTPHONE ROUTE:", {
    userId: target.userId,
    credentialId: target.credentialId,
    sipDestination: target.sipDestination,
    bridgeResult: transfer.ok ? "transfer_requested" : "failed",
    errorCode: transfer.errorCode,
    errorMessage: transfer.errorMessage,
    transferStatus: transfer.status,
    duplicateActiveCredentials: target.duplicateActiveCredentials,
    from: params.from || null,
    to: params.to || null,
    callControlId,
    callLegId: params.callLegId || null,
    callSessionId: params.callSessionId || null,
  });

  if (!transfer.ok) {
    return {
      ok: false,
      reason: "TRANSFER_FAILED",
      userId: target.userId,
      credentialId: target.credentialId,
      sipDestination: target.sipDestination,
      bridgeResult: "failed",
      errorCode: transfer.errorCode,
      errorMessage: transfer.errorMessage,
      transferStatus: transfer.status,
    };
  }

  return {
    ok: true,
    userId: target.userId,
    credentialId: target.credentialId,
    sipDestination: target.sipDestination,
    bridgeResult: "transfer_requested",
    transferStatus: transfer.status,
  };
}
