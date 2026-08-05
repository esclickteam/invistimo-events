import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import TelnyxWebRtcCredential from "@/models/TelnyxWebRtcCredential";
import TelnyxWebRtcTokenAudit from "@/models/TelnyxWebRtcTokenAudit";
import {
  SOFTPHONE_WEBRTC_TOKEN_TTL_SECONDS,
  normalizeCallerNumber,
} from "@/lib/telnyx/webrtcSecurity";

type TelnyxCredentialCreateResponse = {
  data?: {
    id?: string;
    sip_username?: string;
    resource_id?: string;
  };
};

export function buildTelnyxSipUri(sipUsername: string) {
  const user = String(sipUsername || "").trim();
  if (!user) return "";
  return `sip:${user}@sip.telnyx.com`;
}

function getTelnyxApiKey() {
  return String(process.env.TELNYX_API_KEY || "").trim();
}

function getTelnyxConnectionId() {
  return String(
    process.env.TELNYX_WEBRTC_CONNECTION_ID ||
      process.env.TELNYX_CONNECTION_ID ||
      ""
  ).trim();
}

export function getSoftphoneCallerId() {
  return normalizeCallerNumber(
    process.env.TELNYX_FROM_NUMBER || "+972555172720"
  );
}

async function telnyxFetch(path: string, init?: RequestInit) {
  const apiKey = getTelnyxApiKey();
  if (!apiKey) {
    throw new Error("TELNYX_API_KEY_MISSING");
  }

  const res = await fetch(`https://api.telnyx.com/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  return res;
}

async function createTelnyxTelephonyCredential(userId: string) {
  const connectionId = getTelnyxConnectionId();
  if (!connectionId) {
    throw new Error("TELNYX_CONNECTION_ID_MISSING");
  }

  const res = await telnyxFetch("/telephony_credentials", {
    method: "POST",
    body: JSON.stringify({
      connection_id: connectionId,
      name: `invistimo-softphone-${userId}`,
      tag: "invistimo-softphone",
    }),
  });

  const data = (await res.json().catch(() => null)) as
    | TelnyxCredentialCreateResponse
    | null;

  const credentialId = data?.data?.id;
  const sipUsername = String(data?.data?.sip_username || "").trim();
  if (!res.ok || !credentialId) {
    throw new Error("TELNYX_CREATE_CREDENTIAL_FAILED");
  }

  // Persist sip_username only (public SIP identity). Never persist sip_password.
  return {
    telnyxCredentialId: String(credentialId),
    sipUsername: sipUsername || null,
  };
}

export async function getSipUsernameForCredentialId(credentialId: string) {
  const meta = await getTelephonyCredentialMeta(credentialId);
  return meta.sipUsername;
}

export async function getTelephonyCredentialMeta(credentialId: string) {
  const id = String(credentialId || "").trim();
  if (!id) {
    return { sipUsername: "", connectionId: "" };
  }

  const res = await telnyxFetch(
    `/telephony_credentials/${encodeURIComponent(id)}`,
    { method: "GET" }
  );

  const data = (await res.json().catch(() => null)) as
    | TelnyxCredentialCreateResponse
    | null;

  if (!res.ok) {
    return { sipUsername: "", connectionId: "" };
  }

  const resourceId = String(data?.data?.resource_id || "");
  const connectionId = resourceId.replace(/^connection:/i, "").trim();

  return {
    sipUsername: String(data?.data?.sip_username || "").trim(),
    connectionId,
  };
}

export function getConfiguredTelnyxWebRtcConnectionId() {
  return getTelnyxConnectionId();
}

async function createTelnyxLoginToken(credentialId: string) {
  const res = await telnyxFetch(
    `/telephony_credentials/${encodeURIComponent(credentialId)}/token`,
    { method: "POST" }
  );

  const contentType = res.headers.get("content-type") || "";
  let token = "";

  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => null);
    if (typeof data === "string") {
      token = data;
    } else if (typeof data?.data === "string") {
      token = data.data;
    } else if (typeof data?.token === "string") {
      token = data.token;
    } else if (typeof data?.login_token === "string") {
      token = data.login_token;
    }
  } else {
    token = (await res.text().catch(() => "")).trim();
  }

  if (!res.ok || !token) {
    throw new Error("TELNYX_CREATE_TOKEN_FAILED");
  }

  return token;
}

async function deleteTelnyxTelephonyCredential(credentialId: string) {
  const res = await telnyxFetch(
    `/telephony_credentials/${encodeURIComponent(credentialId)}`,
    { method: "DELETE" }
  );

  // 404 means already gone — treat as success for revoke idempotency.
  if (!res.ok && res.status !== 404) {
    throw new Error("TELNYX_DELETE_CREDENTIAL_FAILED");
  }
}

export async function ensureActiveTelnyxCredentialId(userId: string) {
  await connectDB();

  const existing = await TelnyxWebRtcCredential.findOne({
    userId,
    status: "active",
  }).lean();

  if (existing?.telnyxCredentialId) {
    if (!(existing as any).sipUsername) {
      const sipUsername = await getSipUsernameForCredentialId(
        String(existing.telnyxCredentialId)
      );
      if (sipUsername) {
        await TelnyxWebRtcCredential.updateOne(
          { _id: existing._id },
          { $set: { sipUsername } }
        );
      }
    }
    return String(existing.telnyxCredentialId);
  }

  const created = await createTelnyxTelephonyCredential(userId);

  await TelnyxWebRtcCredential.create({
    userId,
    telnyxCredentialId: created.telnyxCredentialId,
    sipUsername: created.sipUsername,
    status: "active",
    revokedAt: null,
    revokeReason: null,
  });

  return created.telnyxCredentialId;
}

export async function issueSoftphoneLoginToken(userId: string) {
  const credentialId = await ensureActiveTelnyxCredentialId(userId);
  const loginToken = await createTelnyxLoginToken(credentialId);
  const callerId = getSoftphoneCallerId();

  if (!callerId) {
    throw new Error("TELNYX_FROM_NUMBER_MISSING");
  }

  return {
    authType: "jwt" as const,
    login_token: loginToken,
    expiresIn: SOFTPHONE_WEBRTC_TOKEN_TTL_SECONDS,
    callerId,
  };
}

export async function revokeTelnyxWebRtcForUser(
  userId: string,
  reason: string
) {
  if (!userId) return { revoked: 0 };

  await connectDB();

  const active = await TelnyxWebRtcCredential.find({
    userId,
    status: "active",
  }).lean();

  let revoked = 0;

  for (const item of active) {
    const credentialId = String(item.telnyxCredentialId || "");
    if (!credentialId) continue;

    try {
      await deleteTelnyxTelephonyCredential(credentialId);
    } catch (error) {
      console.error("TELNYX WEBRTC REVOKE REMOTE FAILED:", {
        userId,
        reason,
        // Do not log credential secrets — id only.
        hasCredentialId: Boolean(credentialId),
      });
      throw error;
    }

    await TelnyxWebRtcCredential.updateOne(
      { _id: item._id },
      {
        $set: {
          status: "revoked",
          revokedAt: new Date(),
          revokeReason: reason,
        },
      }
    );

    revoked += 1;
  }

  return { revoked };
}

export async function writeSoftphoneTokenAudit(input: {
  userId?: string | null;
  role?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  success: boolean;
  failureReason?: string | null;
}) {
  try {
    await connectDB();

    await TelnyxWebRtcTokenAudit.create({
      userId:
        input.userId && mongoose.Types.ObjectId.isValid(input.userId)
          ? input.userId
          : null,
      role: input.role || null,
      ip: input.ip || null,
      userAgent: input.userAgent ? String(input.userAgent).slice(0, 500) : null,
      success: input.success,
      failureReason: input.failureReason || null,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("TELNYX WEBRTC TOKEN AUDIT WRITE FAILED");
  }
}
