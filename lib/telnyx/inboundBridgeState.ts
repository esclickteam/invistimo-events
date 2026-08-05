import { randomUUID } from "crypto";

import { connectDB } from "@/lib/db";
import InboundSoftphoneBridgeAttempt, {
  INBOUND_BRIDGE_ACTIVE_STATUSES,
  type InboundBridgeStatus,
  type InboundSoftphoneBridgeAttemptDoc,
} from "@/models/InboundSoftphoneBridgeAttempt";

/** Invistimo Voice App — only valid Call Control App for dial+bridge. */
export const INVISTIMO_VOICE_APP_CONNECTION_ID = "2972009098091955745";

export const INBOUND_BRIDGE_MAX_ATTEMPTS = 2;
export const INBOUND_BRIDGE_LOCK_TTL_MS = 30_000;
export const INBOUND_BRIDGE_RETRY_DELAY_MS = 2_000;
/** Stale for pre-answer states (claimed/dialing/ringing). */
export const INBOUND_BRIDGE_STALE_MS = 90_000;
/** Stale for answered/bridged only after long inactivity (never kill healthy live calls). */
export const INBOUND_BRIDGE_ANSWERED_STALE_MS = 15 * 60_000;
/** Soft stop before Telnyx account outbound cap of 10. */
export const INBOUND_BRIDGE_CAPACITY_SOFT_LIMIT = 8;

const RETRYABLE_STATUSES: InboundBridgeStatus[] = [
  "failed_timeout",
  "failed_rejected",
  "failed_canceled",
  "failed_busy",
  "failed",
];

const PRE_ANSWER_STALE_STATUSES: InboundBridgeStatus[] = [
  "claimed",
  "dialing",
  "ringing",
];

let indexesEnsured = false;

function getTelnyxApiKey() {
  return String(process.env.TELNYX_API_KEY || "").trim();
}

function touchNow() {
  return new Date();
}

export function getInvistimoVoiceAppConnectionId() {
  const fromEnv = String(
    process.env.TELNYX_CALL_CONTROL_APP_ID ||
      process.env.TELNYX_VOICE_CONNECTION_ID ||
      process.env.TELNYX_CONNECTION_ID ||
      ""
  ).trim();

  const webrtc = String(process.env.TELNYX_WEBRTC_CONNECTION_ID || "").trim();
  if (fromEnv && fromEnv !== webrtc) return fromEnv;

  return INVISTIMO_VOICE_APP_CONNECTION_ID;
}

export function isActiveBridgeStatus(status?: string | null) {
  return INBOUND_BRIDGE_ACTIVE_STATUSES.includes(
    String(status || "") as InboundBridgeStatus
  );
}

export function mapHangupCauseToBridgeStatus(cause: string): InboundBridgeStatus {
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

/**
 * Create unique indexes safely. Never crash startup on duplicate key —
 * dedupe keep-newest first, then createIndex (ignore if already exists).
 */
export async function ensureInboundBridgeIndexes() {
  if (indexesEnsured) return;
  await connectDB();

  const col = InboundSoftphoneBridgeAttempt.collection;

  // Dedupe inboundCallControlId — keep newest by startedAt/createdAt.
  const dupes = await col
    .aggregate([
      {
        $group: {
          _id: "$inboundCallControlId",
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          docs: { $push: { id: "$_id", startedAt: "$startedAt", createdAt: "$createdAt" } },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  for (const group of dupes) {
    const sorted = [...(group.docs || [])].sort((a: any, b: any) => {
      const at = new Date(a.startedAt || a.createdAt || 0).getTime();
      const bt = new Date(b.startedAt || b.createdAt || 0).getTime();
      return bt - at;
    });
    const keep = sorted[0]?.id;
    const remove = sorted.slice(1).map((d: any) => d.id).filter(Boolean);
    if (keep && remove.length) {
      await col.deleteMany({ _id: { $in: remove } });
      console.warn("INBOUND BRIDGE DEDUPED", {
        inboundCallControlId: group._id,
        removed: remove.length,
      });
    }
  }

  try {
    await col.createIndex(
      { inboundCallControlId: 1 },
      { unique: true, name: "inboundCallControlId_unique" }
    );
  } catch (error: any) {
    if (error?.code !== 85 && error?.code !== 86 && error?.code !== 11000) {
      console.warn("INBOUND BRIDGE INDEX inboundCallControlId:", error?.message || error);
    }
  }

  try {
    await col.createIndex(
      { bridgeAttemptId: 1 },
      { unique: true, name: "bridgeAttemptId_unique" }
    );
  } catch (error: any) {
    if (error?.code !== 85 && error?.code !== 86 && error?.code !== 11000) {
      console.warn("INBOUND BRIDGE INDEX bridgeAttemptId:", error?.message || error);
    }
  }

  indexesEnsured = true;
}

export async function countActiveBridgeAttempts() {
  await connectDB();
  return InboundSoftphoneBridgeAttempt.countDocuments({
    status: { $in: INBOUND_BRIDGE_ACTIVE_STATUSES },
    endedAt: null,
  });
}

export async function getActiveBridgeUserIds() {
  await connectDB();
  const rows = await InboundSoftphoneBridgeAttempt.find({
    status: { $in: INBOUND_BRIDGE_ACTIVE_STATUSES },
    endedAt: null,
    userId: { $nin: [null, ""] },
  })
    .select("userId")
    .lean();

  return new Set(
    rows.map((row) => String(row.userId || "")).filter(Boolean)
  );
}

export async function telnyxHangupCall(callControlId: string) {
  const id = String(callControlId || "").trim();
  const apiKey = getTelnyxApiKey();
  if (!id || !apiKey) {
    return { ok: false as const, status: 0, errorCode: "HANGUP_PRECONDITION" };
  }

  // Server-side only. Never log apiKey / tokens / full Authorization header.
  const res = await fetch(
    `https://api.telnyx.com/v2/calls/${encodeURIComponent(id)}/actions/hangup`,
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

  if (!res) {
    return { ok: false as const, status: 0, errorCode: "HANGUP_NETWORK" };
  }

  const data = await res.json().catch(() => null);
  const firstError = Array.isArray(data?.errors) ? data.errors[0] : null;
  const detail = String(firstError?.detail || firstError?.title || "").toLowerCase();

  // 404 / already ended → success (channel already free).
  if (
    res.ok ||
    res.status === 404 ||
    detail.includes("not found") ||
    detail.includes("already ended") ||
    detail.includes("call has already ended")
  ) {
    return { ok: true as const, status: res.status, errorCode: null };
  }

  return {
    ok: false as const,
    status: res.status,
    errorCode: String(firstError?.code || "TELNYX_HANGUP_FAILED"),
  };
}

type ClaimParams = {
  inboundCallControlId: string;
  inboundCallLegId?: string;
  inboundCallSessionId?: string;
  inboundConnectionId?: string;
  lockOwner: string;
};

export type BridgeClaimResult =
  | {
      ok: true;
      mode: "created" | "retry" | "reclaimed_lock";
      attempt: InboundSoftphoneBridgeAttemptDoc;
    }
  | {
      ok: false;
      reason:
        | "ACTIVE_BRIDGE_EXISTS"
        | "CAPACITY_SOFT_LIMIT"
        | "MAX_ATTEMPTS"
        | "LOCK_HELD"
        | "MISSING_CALL_CONTROL_ID";
      attempt?: InboundSoftphoneBridgeAttemptDoc | null;
    };

/**
 * Atomic idempotency + short lock for inbound-bridge:{callControlId}.
 * Expired lock on pre-dial claim can be reclaimed without a second outbound leg.
 */
export async function claimInboundBridgeAttempt(
  params: ClaimParams
): Promise<BridgeClaimResult> {
  await ensureInboundBridgeIndexes();

  const inboundCallControlId = String(params.inboundCallControlId || "").trim();
  if (!inboundCallControlId) {
    return { ok: false, reason: "MISSING_CALL_CONTROL_ID" };
  }

  const activeCount = await countActiveBridgeAttempts();
  if (activeCount >= INBOUND_BRIDGE_CAPACITY_SOFT_LIMIT) {
    console.warn("INBOUND BRIDGE CAPACITY GUARD", {
      activeCount,
      softLimit: INBOUND_BRIDGE_CAPACITY_SOFT_LIMIT,
      inboundCallControlId,
    });
    return { ok: false, reason: "CAPACITY_SOFT_LIMIT" };
  }

  const now = touchNow();
  const lockExpiresAt = new Date(now.getTime() + INBOUND_BRIDGE_LOCK_TTL_MS);
  const bridgeAttemptId = randomUUID();

  try {
    const created = await InboundSoftphoneBridgeAttempt.create({
      bridgeAttemptId,
      inboundCallControlId,
      inboundCallLegId: params.inboundCallLegId || null,
      inboundCallSessionId: params.inboundCallSessionId || null,
      inboundConnectionId: params.inboundConnectionId || null,
      status: "claimed",
      attemptNumber: 1,
      maxAttempts: INBOUND_BRIDGE_MAX_ATTEMPTS,
      busyCredentialIds: [],
      lockOwner: params.lockOwner,
      lockExpiresAt,
      startedAt: now,
      lastEventAt: now,
    });

    return { ok: true, mode: "created", attempt: created.toObject() as any };
  } catch (error: any) {
    const isDup =
      error?.code === 11000 ||
      String(error?.message || "").includes("duplicate key");
    if (!isDup) throw error;
  }

  // Reclaim expired lock only in pre-dial "claimed" (never while dialing in-flight).
  const reclaimed = await InboundSoftphoneBridgeAttempt.findOneAndUpdate(
    {
      inboundCallControlId,
      status: "claimed",
      outboundCallControlId: null,
      endedAt: null,
      $or: [{ lockExpiresAt: null }, { lockExpiresAt: { $lte: now } }],
    },
    {
      $set: {
        lockOwner: params.lockOwner,
        lockExpiresAt,
        status: "claimed",
        lastEventAt: now,
      },
    },
    { new: true }
  ).lean();

  if (reclaimed) {
    return { ok: true, mode: "reclaimed_lock", attempt: reclaimed as any };
  }

  const existing = await InboundSoftphoneBridgeAttempt.findOne({
    inboundCallControlId,
  }).lean();

  if (!existing) {
    return { ok: false, reason: "LOCK_HELD" };
  }

  // Already dialed / in-call — never create another outbound.
  if (
    isActiveBridgeStatus(existing.status) ||
    existing.outboundCallControlId
  ) {
    return { ok: false, reason: "ACTIVE_BRIDGE_EXISTS", attempt: existing as any };
  }

  if (existing.attemptNumber >= (existing.maxAttempts || INBOUND_BRIDGE_MAX_ATTEMPTS)) {
    return { ok: false, reason: "MAX_ATTEMPTS", attempt: existing as any };
  }

  if (!RETRYABLE_STATUSES.includes(existing.status as InboundBridgeStatus)) {
    return { ok: false, reason: "ACTIVE_BRIDGE_EXISTS", attempt: existing as any };
  }

  if (!existing.endedAt) {
    return { ok: false, reason: "ACTIVE_BRIDGE_EXISTS", attempt: existing as any };
  }

  const claimed = await InboundSoftphoneBridgeAttempt.findOneAndUpdate(
    {
      inboundCallControlId,
      status: { $in: RETRYABLE_STATUSES },
      endedAt: { $ne: null },
      attemptNumber: { $lt: INBOUND_BRIDGE_MAX_ATTEMPTS },
      $or: [{ lockExpiresAt: null }, { lockExpiresAt: { $lte: now } }],
    },
    {
      $set: {
        status: "claimed",
        lockOwner: params.lockOwner,
        lockExpiresAt,
        endedAt: null,
        outboundCallControlId: null,
        outboundCallLegId: null,
        dialStartedAt: null,
        answeredAt: null,
        hangupCause: null,
        sipCode: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        lastEventAt: now,
      },
      $inc: { attemptNumber: 1 },
    },
    { new: true }
  ).lean();

  if (!claimed) {
    return { ok: false, reason: "LOCK_HELD", attempt: existing as any };
  }

  return { ok: true, mode: "retry", attempt: claimed as any };
}

export async function markBridgeDialing(params: {
  inboundCallControlId: string;
  userId: string;
  credentialId: string;
  sipDestination: string;
  dialConnectionId: string;
}) {
  await connectDB();
  const now = touchNow();
  return InboundSoftphoneBridgeAttempt.findOneAndUpdate(
    {
      inboundCallControlId: params.inboundCallControlId,
      status: "claimed",
    },
    {
      $set: {
        status: "dialing",
        userId: params.userId,
        credentialId: params.credentialId,
        sipDestination: params.sipDestination,
        dialConnectionId: params.dialConnectionId,
        dialStartedAt: now,
        lastEventAt: now,
      },
    },
    { new: true }
  ).lean();
}

export async function markBridgeOutboundCreated(params: {
  inboundCallControlId: string;
  outboundCallControlId: string;
}) {
  await connectDB();
  const now = touchNow();
  return InboundSoftphoneBridgeAttempt.findOneAndUpdate(
    {
      inboundCallControlId: params.inboundCallControlId,
      status: { $in: ["claimed", "dialing"] },
    },
    {
      $set: {
        status: "ringing",
        outboundCallControlId: params.outboundCallControlId,
        lastEventAt: now,
      },
    },
    { new: true }
  ).lean();
}

export async function markBridgeFailed(params: {
  inboundCallControlId: string;
  status: InboundBridgeStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  hangupCause?: string | null;
  credentialId?: string | null;
  markCredentialBusy?: boolean;
}) {
  await connectDB();
  const now = touchNow();
  const update: Record<string, unknown> = {
    status: params.status,
    endedAt: now,
    lockExpiresAt: now,
    lockOwner: null,
    lastErrorCode: params.errorCode || null,
    lastErrorMessage: params.errorMessage || null,
    hangupCause: params.hangupCause || null,
    lastEventAt: now,
  };

  const ops: Record<string, unknown> = { $set: update };
  if (params.markCredentialBusy && params.credentialId) {
    ops.$addToSet = { busyCredentialIds: params.credentialId };
  }

  return InboundSoftphoneBridgeAttempt.findOneAndUpdate(
    { inboundCallControlId: params.inboundCallControlId },
    ops,
    { new: true }
  ).lean();
}

export async function updateBridgeFromWebhook(params: {
  callControlId: string;
  eventType: string;
  hangupCause?: string;
  direction?: string;
}) {
  await connectDB();
  const callControlId = String(params.callControlId || "").trim();
  if (!callControlId) return null;

  const attempt = await InboundSoftphoneBridgeAttempt.findOne({
    $or: [
      { inboundCallControlId: callControlId },
      { outboundCallControlId: callControlId },
    ],
  });

  if (!attempt) return null;

  const eventType = String(params.eventType || "").toLowerCase();
  const isOutboundLeg =
    attempt.outboundCallControlId &&
    attempt.outboundCallControlId === callControlId;
  const now = touchNow();
  attempt.lastEventAt = now;

  if (eventType === "call.answered" || eventType === "call.bridged") {
    if (isActiveBridgeStatus(attempt.status)) {
      attempt.status = eventType === "call.bridged" ? "bridged" : "answered";
      attempt.answeredAt = attempt.answeredAt || now;
      await attempt.save();
    } else {
      await attempt.save();
    }
    return attempt.toObject();
  }

  if (eventType === "call.hangup") {
    const cause = String(params.hangupCause || "");
    const nextStatus = mapHangupCauseToBridgeStatus(cause);

    if (
      !isOutboundLeg &&
      attempt.outboundCallControlId &&
      isActiveBridgeStatus(attempt.status)
    ) {
      await telnyxHangupCall(attempt.outboundCallControlId);
    }

    if (
      isOutboundLeg &&
      (nextStatus === "failed_busy" ||
        nextStatus === "failed_rejected" ||
        nextStatus === "failed_timeout") &&
      attempt.inboundCallControlId
    ) {
      await telnyxHangupCall(attempt.inboundCallControlId);
    }

    attempt.status =
      attempt.status === "answered" || attempt.status === "bridged"
        ? "completed"
        : nextStatus;
    attempt.hangupCause = cause || attempt.hangupCause || null;
    attempt.endedAt = now;
    attempt.lockOwner = null;
    attempt.lockExpiresAt = now;

    if (nextStatus === "failed_busy" && attempt.credentialId) {
      if (!attempt.busyCredentialIds.includes(attempt.credentialId)) {
        attempt.busyCredentialIds.push(attempt.credentialId);
      }
    }

    await attempt.save();

    console.log("INBOUND BRIDGE WEBHOOK UPDATE:", {
      bridgeAttemptId: attempt.bridgeAttemptId,
      inboundCallControlId: attempt.inboundCallControlId,
      outboundCallControlId: attempt.outboundCallControlId || null,
      userId: attempt.userId || null,
      credentialId: attempt.credentialId || null,
      attemptNumber: attempt.attemptNumber,
      bridgeStatus: attempt.status,
      hangupCause: attempt.hangupCause || null,
      startedAt: attempt.startedAt || null,
      endedAt: attempt.endedAt || null,
      lastEventAt: attempt.lastEventAt || null,
      leg: isOutboundLeg ? "outbound" : "inbound",
    });

    return attempt.toObject();
  }

  await attempt.save();
  return attempt.toObject();
}

/**
 * Hang up Telnyx legs for stale bridges only.
 * - claimed/dialing/ringing: stale after INBOUND_BRIDGE_STALE_MS without lastEventAt
 * - answered/bridged: only after INBOUND_BRIDGE_ANSWERED_STALE_MS of inactivity
 * Healthy answered/bridged with recent lastEventAt/updatedAt are never closed.
 */
export async function cleanupStaleInboundBridges(limit = 25) {
  await ensureInboundBridgeIndexes();
  const nowMs = Date.now();
  const preAnswerCutoff = new Date(nowMs - INBOUND_BRIDGE_STALE_MS);
  const answeredCutoff = new Date(nowMs - INBOUND_BRIDGE_ANSWERED_STALE_MS);

  const stale = await InboundSoftphoneBridgeAttempt.find({
    endedAt: null,
    $or: [
      {
        status: { $in: PRE_ANSWER_STALE_STATUSES },
        $or: [
          { lastEventAt: { $lte: preAnswerCutoff } },
          { lastEventAt: null, updatedAt: { $lte: preAnswerCutoff } },
          { lastEventAt: null, updatedAt: null, startedAt: { $lte: preAnswerCutoff } },
        ],
      },
      {
        status: { $in: ["answered", "bridged"] },
        $or: [
          { lastEventAt: { $lte: answeredCutoff } },
          { lastEventAt: null, updatedAt: { $lte: answeredCutoff } },
        ],
      },
    ],
  })
    .sort({ lastEventAt: 1, startedAt: 1 })
    .limit(limit);

  const results: Array<Record<string, unknown>> = [];

  for (const attempt of stale) {
    // Defense: skip if lastEventAt is actually recent (race with live call).
    const last =
      attempt.lastEventAt || attempt.updatedAt || attempt.startedAt || null;
    const lastMs = last ? new Date(last).getTime() : 0;
    const isAnswered =
      attempt.status === "answered" || attempt.status === "bridged";
    const minAge = isAnswered
      ? INBOUND_BRIDGE_ANSWERED_STALE_MS
      : INBOUND_BRIDGE_STALE_MS;
    if (lastMs && nowMs - lastMs < minAge) {
      continue;
    }

    const outboundHangup = attempt.outboundCallControlId
      ? await telnyxHangupCall(attempt.outboundCallControlId)
      : { ok: true, status: 0, errorCode: null };
    const inboundHangup = attempt.inboundCallControlId
      ? await telnyxHangupCall(attempt.inboundCallControlId)
      : { ok: true, status: 0, errorCode: null };

    const now = touchNow();
    attempt.status = "cleaned_stale";
    attempt.hangupCause = "stale_bridge_timeout";
    attempt.endedAt = now;
    attempt.lastEventAt = now;
    attempt.lockOwner = null;
    attempt.lockExpiresAt = now;
    attempt.lastErrorCode = "STALE_BRIDGE_CLEANUP";
    await attempt.save();

    const row = {
      bridgeAttemptId: attempt.bridgeAttemptId,
      inboundCallControlId: attempt.inboundCallControlId,
      outboundCallControlId: attempt.outboundCallControlId || null,
      userId: attempt.userId || null,
      credentialId: attempt.credentialId || null,
      attemptNumber: attempt.attemptNumber,
      bridgeStatus: attempt.status,
      outboundHangupOk: outboundHangup.ok,
      inboundHangupOk: inboundHangup.ok,
      startedAt: attempt.startedAt || null,
      endedAt: attempt.endedAt || null,
      lastEventAt: attempt.lastEventAt || null,
    };
    console.log("INBOUND BRIDGE STALE CLEANUP:", row);
    results.push(row);
  }

  return { cleaned: results.length, results };
}

export function credentialBlockedByBusyHistory(
  attempt: Pick<InboundSoftphoneBridgeAttemptDoc, "busyCredentialIds"> | null | undefined,
  credentialId: string
) {
  const id = String(credentialId || "").trim();
  if (!id || !attempt) return false;
  return (attempt.busyCredentialIds || []).includes(id);
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
