import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a Bizuply forward with its own HMAC.
 * A request without these headers stays on the existing 360dialog path.
 * Meta's X-Hub-Signature-256 is never accepted here.
 */
export const FORWARD_SIGNATURE_HEADER = "x-invistimo-forward-signature";
export const FORWARD_TIMESTAMP_HEADER = "x-invistimo-forward-timestamp";
const FORWARD_MAX_SKEW_SEC = 300;
const FORWARD_VECTOR_HEX =
  "834acc42a749b097d45f311f8b71e540a6cbad405e732646a3b0737cf5a88c14";

export function signBizuplyForward(secret: string, timestamp: string, rawBody: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function forwardSignatureVector() {
  return {
    secret: "test-forward-secret",
    timestamp: "1760000000",
    rawBody: '{"ok":true}',
    signature: FORWARD_VECTOR_HEX,
  };
}

export function readForwardHeaders(headers: Headers) {
  const signature = String(headers.get(FORWARD_SIGNATURE_HEADER) || "").trim();
  const timestamp = String(headers.get(FORWARD_TIMESTAMP_HEADER) || "").trim();
  return { present: Boolean(signature || timestamp), signature, timestamp };
}

export function verifyBizuplyForward({
  secret,
  timestamp,
  rawBody,
  signature,
  nowSec = Math.floor(Date.now() / 1000),
}: {
  secret: string;
  timestamp: string;
  rawBody: string;
  signature: string;
  nowSec?: number;
}) {
  const reasons: string[] = [];
  if (!secret) reasons.push("missing_secret");
  if (!timestamp) reasons.push("missing_timestamp");
  if (!signature) reasons.push("missing_signature");
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) reasons.push("invalid_timestamp");
  else if (Math.abs(nowSec - ts) > FORWARD_MAX_SKEW_SEC) reasons.push("stale_timestamp");
  const expected = secret ? signBizuplyForward(secret, timestamp, rawBody) : "";
  const left = Buffer.from(expected);
  const right = Buffer.from(signature || "");
  const match =
    left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
  if (!match) reasons.push("signature_mismatch");
  return { ok: reasons.length === 0, reasons, reusesMetaSignature: false };
}

/**
 * 360dialog Cloud API already posts Meta's entry/changes envelope.
 * A legacy top-level messages/statuses body is wrapped into that envelope.
 * An existing Cloud payload is returned unchanged.
 */
export function normalizeIncomingWebhook(body: any) {
  if (body && Array.isArray(body.entry)) return body;
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const statuses = Array.isArray(body?.statuses) ? body.statuses : [];
  if (!messages.length && !statuses.length) return body;
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: body?.metadata || {},
              contacts: body?.contacts || [],
              messages,
              statuses,
            },
          },
        ],
      },
    ],
  };
}

export function incomingText(message: any) {
  const type = String(message?.type || "").trim();
  if (type === "text") return String(message?.text?.body || "").trim();
  if (type === "button") {
    return String(message?.button?.text || message?.button?.payload || "").trim();
  }
  if (type === "interactive") {
    return String(
      message?.interactive?.button_reply?.title ||
        message?.interactive?.button_reply?.id ||
        message?.interactive?.list_reply?.title ||
        message?.interactive?.list_reply?.id ||
        ""
    ).trim();
  }
  return "";
}

const STATUS_RANK: Record<string, number> = {
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

/**
 * Pure description of what the webhook may change.
 * RSVP is never one of the writes. A repeated wamid is a duplicate.
 */
export function planWebhookEffects(
  body: any,
  state: {
    inboundIds?: string[];
    statusByWamid?: Record<string, string>;
  } = {}
) {
  const normalized = normalizeIncomingWebhook(body);
  const inboundIds = new Set(state.inboundIds || []);
  const statusByWamid = { ...(state.statusByWamid || {}) };
  const inbound: Array<{ wamid: string; type: string; text: string }> = [];
  const statuses: Array<{ wamid: string; status: string }> = [];
  const duplicates: string[] = [];
  const rsvpWrites: string[] = [];

  for (const entry of normalized?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value || {};
      for (const message of value.messages || []) {
        const wamid = String(message?.id || "");
        if (!wamid) continue;
        if (inboundIds.has(wamid)) {
          duplicates.push(wamid);
          continue;
        }
        inboundIds.add(wamid);
        inbound.push({ wamid, type: String(message?.type || ""), text: incomingText(message) });
      }
      for (const status of value.statuses || []) {
        const wamid = String(status?.id || "");
        const next = String(status?.status || "");
        if (!wamid || !next) continue;
        const current = STATUS_RANK[statusByWamid[wamid]] || 0;
        if ((STATUS_RANK[next] || 0) <= current) {
          duplicates.push(wamid);
          continue;
        }
        statusByWamid[wamid] = next;
        statuses.push({ wamid, status: next });
      }
    }
  }

  return {
    inbound,
    statuses,
    duplicates,
    rsvpWrites,
    inboundIds: [...inboundIds],
    statusByWamid,
  };
}
