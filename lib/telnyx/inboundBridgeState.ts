import { randomUUID } from "crypto";

import { connectDB } from "@/lib/db";
import InboundSoftphoneBridgeAttempt, {
  INBOUND_BRIDGE_ACTIVE_STATUSES,
  type InboundBridgeStatus,
  type InboundSoftphoneBridgeAttemptDoc,
} from "@/models/InboundSoftphoneBridgeAttempt";
import {
  applyBridgeWebhookEvent,
  applyOutboundCreatedToAttempt,
  getConfiguredVoiceAppConnectionId,
  mapHangupCauseToStatus,
  parseBridgeClientState,
  resolveBridgeSessionId,
  type BridgeClientState,
} from "@/lib/telnyx/inboundBridgeRules";

export {
  INVISTIMO_VOICE_APP_CONNECTION_ID,
  isRoutablePstnInboundLeg,
  encodeBridgeClientState,
  parseBridgeClientState,
  resolveBridgeSessionId,
  applyOutboundCreatedToAttempt,
  applyBridgeWebhookEvent,
  getConfiguredVoiceAppConnectionId,
  getConfiguredWebrtcConnectionId,
  getConfiguredInvistimoDid,
} from "@/lib/telnyx/inboundBridgeRules";

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
  return getConfiguredVoiceAppConnectionId({
    TELNYX_CALL_CONTROL_APP_ID: process.env.TELNYX_CALL_CONTROL_APP_ID,
    TELNYX_VOICE_CONNECTION_ID: process.env.TELNYX_VOICE_CONNECTION_ID,
    TELNYX_CONNECTION_ID: process.env.TELNYX_CONNECTION_ID,
    TELNYX_WEBRTC_CONNECTION_ID: process.env.TELNYX_WEBRTC_CONNECTION_ID,
  });
}

export function isActiveBridgeStatus(status?: string | null) {
  return INBOUND_BRIDGE_ACTIVE_STATUSES.includes(
    String(status || "") as InboundBridgeStatus
  );
}

export function mapHangupCauseToBridgeStatus(cause: string): InboundBridgeStatus {
  return mapHangupCauseToStatus(cause) as InboundBridgeStatus;
}

async function dedupeByField(field: "rootInboundCallControlId" | "bridgeSessionId" | "inboundCallControlId" | "bridgeAttemptId") {
  const col = InboundSoftphoneBridgeAttempt.collection;
  const dupes = await col
    .aggregate([
      {
        $group: {
          _id: `$${field}`,
          count: { $sum: 1 },
          docs: {
            $push: { id: "$_id", startedAt: "$startedAt", createdAt: "$createdAt" },
          },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  for (const group of dupes) {
    if (group._id == null || group._id === "") continue;
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
        field,
        key: group._id,
        removed: remove.length,
      });
    }
  }
}

/**
 * Create unique indexes safely. Never crash startup on duplicate key —
 * dedupe keep-newest first, then createIndex (ignore if already exists).
 */
export async function ensureInboundBridgeIndexes() {
  if (indexesEnsured) return;
  await connectDB();

  const col = InboundSoftphoneBridgeAttempt.collection;

  await dedupeByField("rootInboundCallControlId");
  await dedupeByField("inboundCallControlId");
  await dedupeByField("bridgeSessionId");
  await dedupeByField("bridgeAttemptId");

  const indexes: Array<{ key: Record<string, 1>; name: string }> = [
    { key: { rootInboundCallControlId: 1 }, name: "rootInboundCallControlId_unique" },
    { key: { inboundCallControlId: 1 }, name: "inboundCallControlId_unique" },
    { key: { bridgeSessionId: 1 }, name: "bridgeSessionId_unique" },
    { key: { bridgeAttemptId: 1 }, name: "bridgeAttemptId_unique" },
  ];

  for (const idx of indexes) {
    try {
      await col.createIndex(idx.key, { unique: true, name: idx.name });
    } catch (error: any) {
      if (error?.code !== 85 && error?.code !== 86 && error?.code !== 11000) {
        console.warn(`INBOUND BRIDGE INDEX ${idx.name}:`, error?.message || error);
      }
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

async function hangupPeerIds(ids: string[]) {
  const unique = [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
  const results = [];
  for (const id of unique) {
    results.push(await telnyxHangupCall(id));
  }
  return results;
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
 * Atomic idempotency + short lock for PSTN root inbound callControlId.
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
  const bridgeSessionId = resolveBridgeSessionId({
    rootInboundCallControlId: inboundCallControlId,
    callSessionId: params.inboundCallSessionId,
  });

  try {
    const created = await InboundSoftphoneBridgeAttempt.create({
      bridgeAttemptId,
      bridgeSessionId,
      rootInboundCallControlId: inboundCallControlId,
      inboundCallControlId,
      inboundCallLegId: params.inboundCallLegId || null,
      inboundCallSessionId: params.inboundCallSessionId || null,
      inboundConnectionId: params.inboundConnectionId || null,
      status: "claimed",
      attemptNumber: 1,
      maxAttempts: INBOUND_BRIDGE_MAX_ATTEMPTS,
      busyCredentialIds: [],
      pendingPeerHangup: false,
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
      rootInboundCallControlId: inboundCallControlId,
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
    $or: [
      { rootInboundCallControlId: inboundCallControlId },
      { inboundCallControlId },
      { bridgeSessionId },
    ],
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
      rootInboundCallControlId: inboundCallControlId,
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
        webrtcCallControlId: null,
        webrtcCallLegId: null,
        dialStartedAt: null,
        answeredAt: null,
        hangupCause: null,
        pendingPeerHangup: false,
        pendingHangupCause: null,
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

export async function findBridgeAttemptForLeg(params: {
  callControlId?: string | null;
  callSessionId?: string | null;
  clientState?: BridgeClientState | string | null;
}) {
  await connectDB();
  const callControlId = String(params.callControlId || "").trim();
  const callSessionId = String(params.callSessionId || "").trim();
  const clientState =
    typeof params.clientState === "string"
      ? parseBridgeClientState(params.clientState)
      : params.clientState || {};
  const rootFromState = String(clientState.rootInboundCallControlId || "").trim();
  const sessionFromState = String(clientState.bridgeSessionId || "").trim();

  const or: Record<string, unknown>[] = [];
  if (callControlId) {
    or.push(
      { inboundCallControlId: callControlId },
      { rootInboundCallControlId: callControlId },
      { outboundCallControlId: callControlId },
      { webrtcCallControlId: callControlId }
    );
  }
  if (rootFromState) {
    or.push(
      { rootInboundCallControlId: rootFromState },
      { inboundCallControlId: rootFromState }
    );
  }
  if (sessionFromState) {
    or.push({ bridgeSessionId: sessionFromState });
  }
  if (callSessionId) {
    or.push(
      { bridgeSessionId: callSessionId },
      { inboundCallSessionId: callSessionId }
    );
  }

  if (!or.length) return null;

  return InboundSoftphoneBridgeAttempt.findOne({ $or: or }).lean();
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
  const id = String(params.inboundCallControlId || "").trim();

  // Race-safe: answered may arrive before dialing marker; never wipe terminal.
  return InboundSoftphoneBridgeAttempt.findOneAndUpdate(
    {
      $or: [{ rootInboundCallControlId: id }, { inboundCallControlId: id }],
      status: { $in: ["claimed", "dialing", "ringing", "answered", "bridged"] },
    },
    [
      {
        $set: {
          userId: params.userId,
          credentialId: params.credentialId,
          sipDestination: params.sipDestination,
          dialConnectionId: params.dialConnectionId,
          dialStartedAt: { $ifNull: ["$dialStartedAt", now] },
          lastEventAt: now,
          status: {
            $cond: [
              { $in: ["$status", ["claimed"]] },
              "dialing",
              "$status",
            ],
          },
        },
      },
    ],
    { new: true }
  ).lean();
}

/**
 * Persist outbound callControlId even if status already answered/bridged/completed.
 * Does not overwrite terminal status with ringing.
 * If pendingPeerHangup, hang up the outbound leg immediately after mapping.
 */
export async function markBridgeOutboundCreated(params: {
  inboundCallControlId: string;
  outboundCallControlId: string;
  outboundCallLegId?: string | null;
}) {
  await connectDB();
  const now = touchNow();
  const rootId = String(params.inboundCallControlId || "").trim();
  const outboundId = String(params.outboundCallControlId || "").trim();
  const outboundLegId = String(params.outboundCallLegId || "").trim() || null;

  if (!rootId || !outboundId) return null;

  const existing = await InboundSoftphoneBridgeAttempt.findOne({
    $or: [
      { rootInboundCallControlId: rootId },
      { inboundCallControlId: rootId },
    ],
  }).lean();

  if (!existing) return null;

  const applied = applyOutboundCreatedToAttempt(existing as any, {
    outboundCallControlId: outboundId,
    outboundCallLegId: outboundLegId,
  });

  const updated = await InboundSoftphoneBridgeAttempt.findOneAndUpdate(
    {
      _id: existing._id,
      $or: [
        { outboundCallControlId: null },
        { outboundCallControlId: { $exists: false } },
        { outboundCallControlId: "" },
        { outboundCallControlId: outboundId },
      ],
    },
    [
      {
        $set: {
          outboundCallControlId: {
            $cond: [
              {
                $in: [
                  { $ifNull: ["$outboundCallControlId", null] },
                  [null, ""],
                ],
              },
              outboundId,
              "$outboundCallControlId",
            ],
          },
          outboundCallLegId: {
            $cond: [
              {
                $and: [
                  { $ne: [outboundLegId, null] },
                  {
                    $in: [
                      { $ifNull: ["$outboundCallLegId", null] },
                      [null, ""],
                    ],
                  },
                ],
              },
              outboundLegId,
              "$outboundCallLegId",
            ],
          },
          status: {
            $cond: [
              { $in: ["$status", ["claimed", "dialing"]] },
              "ringing",
              "$status",
            ],
          },
          lastEventAt: now,
        },
      },
    ],
    { new: true }
  ).lean();

  const row = updated || existing;
  if (applied.shouldHangupPeer || row.pendingPeerHangup) {
    const peerId = String(row.outboundCallControlId || outboundId || "").trim();
    if (peerId) {
      await telnyxHangupCall(peerId);
      await InboundSoftphoneBridgeAttempt.updateOne(
        { _id: row._id },
        {
          $set: {
            pendingPeerHangup: false,
            lastEventAt: now,
          },
        }
      );
    }
  }

  return updated;
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
    {
      $or: [
        { rootInboundCallControlId: params.inboundCallControlId },
        { inboundCallControlId: params.inboundCallControlId },
      ],
    },
    ops,
    { new: true }
  ).lean();
}

/**
 * Attach secondary leg IDs (outbound dial / WebRTC) without creating a new attempt.
 */
export async function attachSecondaryBridgeLeg(params: {
  callControlId: string;
  callLegId?: string | null;
  callSessionId?: string | null;
  clientState?: BridgeClientState | string | null;
  role?: "outbound" | "webrtc" | "auto";
  to?: string | null;
  connectionId?: string | null;
  direction?: string | null;
}) {
  await connectDB();
  const callControlId = String(params.callControlId || "").trim();
  if (!callControlId) return null;

  const existing = await findBridgeAttemptForLeg({
    callControlId,
    callSessionId: params.callSessionId,
    clientState: params.clientState,
  });
  if (!existing) return null;

  // Already mapped as this control id — idempotent no-op create.
  if (
    existing.inboundCallControlId === callControlId ||
    existing.rootInboundCallControlId === callControlId ||
    existing.outboundCallControlId === callControlId ||
    existing.webrtcCallControlId === callControlId
  ) {
    return existing;
  }

  const clientState =
    typeof params.clientState === "string"
      ? parseBridgeClientState(params.clientState)
      : params.clientState || {};

  const to = String(params.to || "").toLowerCase();
  const direction = String(params.direction || "").toLowerCase();
  const role =
    params.role ||
    (clientState.bridge_intent || clientState.invistimo_inbound_bridge
      ? "outbound"
      : to.includes("gencred")
        ? "webrtc"
        : direction === "outgoing" || direction === "outbound"
          ? "outbound"
          : "webrtc");

  const now = touchNow();
  const set: Record<string, unknown> = { lastEventAt: now };
  if (role === "outbound") {
    if (!existing.outboundCallControlId) set.outboundCallControlId = callControlId;
    if (params.callLegId && !existing.outboundCallLegId) {
      set.outboundCallLegId = params.callLegId;
    }
    if (existing.status === "claimed" || existing.status === "dialing") {
      set.status = "ringing";
    }
  } else {
    if (!existing.webrtcCallControlId) set.webrtcCallControlId = callControlId;
    if (params.callLegId && !existing.webrtcCallLegId) {
      set.webrtcCallLegId = params.callLegId;
    }
  }

  const updated = await InboundSoftphoneBridgeAttempt.findOneAndUpdate(
    { _id: existing._id },
    { $set: set },
    { new: true }
  ).lean();

  if (updated?.pendingPeerHangup) {
    const peers = [
      updated.outboundCallControlId,
      updated.webrtcCallControlId,
      updated.inboundCallControlId,
    ]
      .map((id) => String(id || "").trim())
      .filter((id) => id && id !== callControlId);

    if (peers.length) {
      await hangupPeerIds(peers);
      await InboundSoftphoneBridgeAttempt.updateOne(
        { _id: updated._id },
        { $set: { pendingPeerHangup: false, lastEventAt: now } }
      );
    }
  }

  return updated;
}

export async function updateBridgeFromWebhook(params: {
  callControlId: string;
  eventType: string;
  hangupCause?: string;
  direction?: string;
  callSessionId?: string | null;
  callLegId?: string | null;
  clientState?: BridgeClientState | string | null;
  to?: string | null;
  connectionId?: string | null;
}) {
  await connectDB();
  const callControlId = String(params.callControlId || "").trim();
  if (!callControlId) return null;

  // Secondary legs: attach IDs first (never creates a new attempt).
  await attachSecondaryBridgeLeg({
    callControlId,
    callLegId: params.callLegId,
    callSessionId: params.callSessionId,
    clientState: params.clientState,
    to: params.to,
    connectionId: params.connectionId,
    direction: params.direction,
  });

  const attemptDoc = await InboundSoftphoneBridgeAttempt.findOne({
    $or: [
      { inboundCallControlId: callControlId },
      { rootInboundCallControlId: callControlId },
      { outboundCallControlId: callControlId },
      { webrtcCallControlId: callControlId },
    ],
  });

  if (!attemptDoc) {
    // Session-level lookup for late events before outbound id was stored.
    const bySession = await findBridgeAttemptForLeg({
      callControlId,
      callSessionId: params.callSessionId,
      clientState: params.clientState,
    });
    if (!bySession) return null;

    const linked = await InboundSoftphoneBridgeAttempt.findById(bySession._id);
    if (!linked) return null;
    return applyWebhookToAttemptDoc(linked, params);
  }

  return applyWebhookToAttemptDoc(attemptDoc, params);
}

async function applyWebhookToAttemptDoc(
  attempt: any,
  params: {
    callControlId: string;
    eventType: string;
    hangupCause?: string;
  }
) {
  const now = touchNow();
  const applied = applyBridgeWebhookEvent(
    {
      status: attempt.status,
      inboundCallControlId: attempt.inboundCallControlId,
      outboundCallControlId: attempt.outboundCallControlId,
      webrtcCallControlId: attempt.webrtcCallControlId,
      answeredAt: attempt.answeredAt,
      endedAt: attempt.endedAt,
      hangupCause: attempt.hangupCause,
      pendingPeerHangup: attempt.pendingPeerHangup,
      pendingHangupCause: attempt.pendingHangupCause,
      busyCredentialIds: attempt.busyCredentialIds || [],
      credentialId: attempt.credentialId,
    },
    {
      callControlId: params.callControlId,
      eventType: params.eventType,
      hangupCause: params.hangupCause,
      now,
    }
  );

  attempt.status = applied.attempt.status as InboundBridgeStatus;
  attempt.answeredAt = applied.attempt.answeredAt || attempt.answeredAt;
  attempt.endedAt = applied.attempt.endedAt || attempt.endedAt;
  attempt.hangupCause = applied.attempt.hangupCause || attempt.hangupCause;
  attempt.pendingPeerHangup = Boolean(applied.attempt.pendingPeerHangup);
  attempt.pendingHangupCause =
    applied.attempt.pendingHangupCause || attempt.pendingHangupCause;
  attempt.busyCredentialIds = applied.attempt.busyCredentialIds || [];
  attempt.lastEventAt = now;

  if (applied.attempt.endedAt) {
    attempt.lockOwner = null;
    attempt.lockExpiresAt = now;
  }

  if (applied.peerHangupIds.length) {
    await hangupPeerIds(applied.peerHangupIds);
    attempt.pendingPeerHangup = false;
  }

  await attempt.save();

  if (String(params.eventType || "").toLowerCase() === "call.hangup") {
    console.log("INBOUND BRIDGE WEBHOOK UPDATE:", {
      bridgeAttemptId: attempt.bridgeAttemptId,
      bridgeSessionId: attempt.bridgeSessionId || null,
      rootInboundCallControlId: attempt.rootInboundCallControlId || null,
      inboundCallControlId: attempt.inboundCallControlId,
      outboundCallControlId: attempt.outboundCallControlId || null,
      webrtcCallControlId: attempt.webrtcCallControlId || null,
      userId: attempt.userId || null,
      credentialId: attempt.credentialId || null,
      attemptNumber: attempt.attemptNumber,
      bridgeStatus: attempt.status,
      hangupCause: attempt.hangupCause || null,
      pendingPeerHangup: attempt.pendingPeerHangup || false,
      startedAt: attempt.startedAt || null,
      endedAt: attempt.endedAt || null,
      lastEventAt: attempt.lastEventAt || null,
    });
  }

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

    const peers = [
      attempt.outboundCallControlId,
      attempt.webrtcCallControlId,
      attempt.inboundCallControlId,
    ]
      .map((id) => String(id || "").trim())
      .filter(Boolean);

    await hangupPeerIds(peers);

    const now = touchNow();
    attempt.status = "cleaned_stale";
    attempt.hangupCause = "stale_bridge_timeout";
    attempt.endedAt = now;
    attempt.lastEventAt = now;
    attempt.lockOwner = null;
    attempt.lockExpiresAt = now;
    attempt.pendingPeerHangup = false;
    attempt.lastErrorCode = "STALE_BRIDGE_CLEANUP";
    await attempt.save();

    const row = {
      bridgeAttemptId: attempt.bridgeAttemptId,
      bridgeSessionId: attempt.bridgeSessionId || null,
      inboundCallControlId: attempt.inboundCallControlId,
      outboundCallControlId: attempt.outboundCallControlId || null,
      userId: attempt.userId || null,
      credentialId: attempt.credentialId || null,
      attemptNumber: attempt.attemptNumber,
      bridgeStatus: attempt.status,
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
