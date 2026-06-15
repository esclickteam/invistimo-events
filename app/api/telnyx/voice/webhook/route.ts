import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import CallRecording from "@/models/CallRecording";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CallDirection = "inbound" | "outbound" | "unknown";

type CallStatus =
  | "initiated"
  | "ringing"
  | "answered"
  | "completed"
  | "missed"
  | "no_answer"
  | "busy"
  | "failed"
  | "voicemail"
  | "canceled"
  | "unknown";

type RecordingStatus = "started" | "saved" | "failed" | "deleted";

type TelnyxVoicePayload = {
  call_control_id?: string;
  call_leg_id?: string;
  call_session_id?: string;
  connection_id?: string;
  from?: string;
  to?: string;
  direction?: "incoming" | "outgoing" | "inbound" | "outbound" | string;
  state?: string;
  start_time?: string;
  end_time?: string;
  hangup_cause?: string;
  hangup_source?: string;
  digit?: string;
  client_state?: string;

  recording_id?: string;
  recordingId?: string;
  id?: string;
  recording_url?: string;
  recording_urls?: unknown;
  recording_status?: string;
  recording_started_at?: string;
  recording_ended_at?: string;
  duration_secs?: number;
  duration?: number;
  channels?: string;
  format?: string;

  [key: string]: unknown;
};

type TelnyxVoiceData = {
  id?: string;
  event_type?: string;
  occurred_at?: string;
  payload?: TelnyxVoicePayload;
  record_type?: string;
};

type TelnyxVoiceEvent = {
  data?: TelnyxVoiceData;
};

type TelnyxActionResponse = {
  data?: Record<string, unknown>;
  errors?: unknown;
};

type ParsedClientState = {
  localCallRecordingId?: string;
  callRecordingId?: string;
  recordingMongoId?: string;

  source?: string;
  requestedAt?: string;

  originalTo?: string;
  originalFrom?: string;
  normalizedTo?: string;
  normalizedFrom?: string;

  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  dialedPhone?: string;
  destinationPhone?: string;

  agentId?: string;
  agentName?: string;
  agentEmail?: string;
  agentRole?: string;

  [key: string]: unknown;
};

type R2UploadResult =
  | {
      ok: true;
      storage: "r2";
      bucket: string;
      key: string;
      contentType: string;
      sizeBytes: number;
      uploadedAt: Date;
    }
  | {
      ok: false;
      reason: string;
      details?: unknown;
    };

const mongoCache = globalThis as typeof globalThis & {
  __invistimoMongoose?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
  __invistimoR2Client?: S3Client;
};

async function connectMongo() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "";

  if (!uri) {
    throw new Error("MONGODB_URI is missing");
  }

  if (!mongoCache.__invistimoMongoose) {
    mongoCache.__invistimoMongoose = {
      conn: null,
      promise: null,
    };
  }

  if (mongoCache.__invistimoMongoose.conn) {
    return mongoCache.__invistimoMongoose.conn;
  }

  if (!mongoCache.__invistimoMongoose.promise) {
    mongoCache.__invistimoMongoose.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  mongoCache.__invistimoMongoose.conn =
    await mongoCache.__invistimoMongoose.promise;

  return mongoCache.__invistimoMongoose.conn;
}

function cleanPhone(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizePhoneForCompare(value: unknown) {
  if (typeof value !== "string") return "";

  let clean = value.trim().replace(/[^\d+]/g, "");

  if (!clean) return "";

  clean = clean.replace(/\+/g, (match, offset) => (offset === 0 ? match : ""));

  if (clean.startsWith("00")) {
    clean = `+${clean.slice(2)}`;
  }

  if (clean.startsWith("+")) return clean;

  if (clean.startsWith("972")) return `+${clean}`;

  if (clean.startsWith("0") && clean.length >= 8) {
    return `+972${clean.slice(1)}`;
  }

  if (clean.length === 9 && clean.startsWith("5")) {
    return `+972${clean}`;
  }

  if (clean.length === 8 && /^[23489]/.test(clean)) {
    return `+972${clean}`;
  }

  return clean;
}

function getTelnyxApiKey() {
  return process.env.TELNYX_API_KEY || "";
}

function getSystemPhoneNumber() {
  return normalizePhoneForCompare(
    process.env.TELNYX_FROM_NUMBER || "+97283761556"
  );
}

function getBooleanEnv(name: string, fallback = false) {
  const value = process.env[name];

  if (typeof value !== "string") return fallback;

  return ["1", "true", "yes", "on"].includes(value.toLowerCase().trim());
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const clean = getString(value);
    if (clean) return clean;
  }

  return "";
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffSeconds(start?: Date | null, end?: Date | null) {
  if (!start || !end) return 0;

  const ms = end.getTime() - start.getTime();

  if (!Number.isFinite(ms) || ms <= 0) return 0;

  return Math.round(ms / 1000);
}

function normalizeDirection(value: unknown): CallDirection {
  const direction = getString(value).toLowerCase();

  if (direction === "incoming" || direction === "inbound") return "inbound";
  if (direction === "outgoing" || direction === "outbound") return "outbound";

  return "unknown";
}

function isInboundCall(params: {
  direction: string;
  from: string;
  to: string;
}) {
  const systemNumber = getSystemPhoneNumber();

  const fromNormalized = normalizePhoneForCompare(params.from);
  const toNormalized = normalizePhoneForCompare(params.to);

  if (params.direction === "incoming" || params.direction === "inbound") {
    return true;
  }

  return Boolean(
    systemNumber &&
      toNormalized &&
      toNormalized === systemNumber &&
      fromNormalized !== systemNumber
  );
}

function resolveDirection(params: {
  payloadDirection: unknown;
  clientState: ParsedClientState;
  existing?: any;
  from: string;
  to: string;
}): CallDirection {
  const fromPayload = normalizeDirection(params.payloadDirection);
  if (fromPayload !== "unknown") return fromPayload;

  const existingDirection = normalizeDirection(params.existing?.direction);
  if (existingDirection !== "unknown") return existingDirection;

  const source = getString(params.clientState.source).toLowerCase();

  if (
    source.includes("softphone") ||
    getString(params.clientState.agentId) ||
    getString(params.clientState.agentEmail)
  ) {
    return "outbound";
  }

  const systemNumber = getSystemPhoneNumber();
  const fromNormalized = normalizePhoneForCompare(params.from);
  const toNormalized = normalizePhoneForCompare(params.to);

  if (systemNumber && fromNormalized === systemNumber && toNormalized) {
    return "outbound";
  }

  if (systemNumber && toNormalized === systemNumber && fromNormalized) {
    return "inbound";
  }

  return "unknown";
}

function isValidObjectId(value: unknown) {
  const id = getString(value);
  return Boolean(id && mongoose.Types.ObjectId.isValid(id));
}

function getLocalCallRecordingId(clientState: ParsedClientState) {
  return firstString(
    clientState.localCallRecordingId,
    clientState.callRecordingId,
    clientState.recordingMongoId
  );
}

function parseClientState(value: unknown): ParsedClientState {
  if (typeof value !== "string" || !value.trim()) return {};

  const raw = value.trim();
  const candidates = [raw];

  try {
    candidates.push(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    // ignore base64 errors
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as ParsedClientState;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      // keep trying
    }
  }

  return {};
}

async function findExistingCallRecording(params: {
  clientState: ParsedClientState;
  payload: TelnyxVoicePayload;
  recordingId?: string;
}) {
  const localCallRecordingId = getLocalCallRecordingId(params.clientState);

  if (isValidObjectId(localCallRecordingId)) {
    const byId = await CallRecording.findById(localCallRecordingId);
    if (byId) return byId;
  }

  const recordingId = getString(params.recordingId);

  if (recordingId) {
    const byRecordingId = await CallRecording.findOne({ recordingId });
    if (byRecordingId) return byRecordingId;
  }

  const callControlId = getString(params.payload.call_control_id);
  const callLegId = getString(params.payload.call_leg_id);
  const callSessionId = getString(params.payload.call_session_id);

  const orQuery: Record<string, unknown>[] = [];

  if (callControlId) orQuery.push({ callControlId });
  if (callLegId) orQuery.push({ callLegId });
  if (callSessionId) orQuery.push({ callSessionId });

  if (!orQuery.length) return null;

  return CallRecording.findOne({ $or: orQuery }).sort({ createdAt: -1 });
}

function buildUpdateFilter(params: {
  existing?: any;
  clientState: ParsedClientState;
  payload: TelnyxVoicePayload;
  recordingId?: string;
  eventId?: string;
}) {
  if (params.existing?._id) {
    return { _id: params.existing._id };
  }

  const localCallRecordingId = getLocalCallRecordingId(params.clientState);

  if (isValidObjectId(localCallRecordingId)) {
    return { _id: new mongoose.Types.ObjectId(localCallRecordingId) };
  }

  const recordingId = getString(params.recordingId);
  if (recordingId) return { recordingId };

  const callControlId = getString(params.payload.call_control_id);
  if (callControlId) return { callControlId };

  const callLegId = getString(params.payload.call_leg_id);
  if (callLegId) return { callLegId };

  const callSessionId = getString(params.payload.call_session_id);
  if (callSessionId) return { callSessionId };

  const eventId = getString(params.eventId);
  if (eventId) return { eventId };

  return { eventId: `unknown-${Date.now()}` };
}

function setIfString(target: Record<string, unknown>, key: string, value: unknown) {
  const clean = getString(value);
  if (clean) target[key] = clean;
}

function getCallStatusFromExisting(value: unknown): CallStatus {
  const status = getString(value) as CallStatus;

  if (
    [
      "initiated",
      "ringing",
      "answered",
      "completed",
      "missed",
      "no_answer",
      "busy",
      "failed",
      "voicemail",
      "canceled",
      "unknown",
    ].includes(status)
  ) {
    return status;
  }

  return "unknown";
}

function mapHangupToCallStatus(params: {
  hangupCause: string;
  answeredAt?: Date | null;
  durationSeconds: number;
  direction: CallDirection;
}): CallStatus {
  const cause = params.hangupCause.toLowerCase();

  if (cause.includes("busy")) return "busy";

  if (
    cause.includes("no_answer") ||
    cause.includes("no-answer") ||
    cause.includes("no answer") ||
    cause.includes("timeout")
  ) {
    return "no_answer";
  }

  if (cause.includes("voicemail")) return "voicemail";

  if (
    cause.includes("cancel") ||
    cause.includes("originator_cancel") ||
    cause.includes("user_busy")
  ) {
    return "canceled";
  }

  if (
    cause.includes("failed") ||
    cause.includes("error") ||
    cause.includes("reject") ||
    cause.includes("unallocated") ||
    cause.includes("invalid")
  ) {
    return "failed";
  }

  if (params.answeredAt || params.durationSeconds > 0) {
    return "completed";
  }

  if (params.direction === "inbound") {
    return "missed";
  }

  return "no_answer";
}

/* ============================================================
   R2 helpers
============================================================ */

function getR2Endpoint() {
  const directEndpoint = getString(process.env.R2_ENDPOINT);
  if (directEndpoint) return directEndpoint.replace(/\/+$/, "");

  const accountId = getString(process.env.R2_ACCOUNT_ID);
  if (!accountId) return "";

  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function getR2Config() {
  const endpoint = getR2Endpoint();
  const bucket = getString(process.env.R2_BUCKET_NAME);
  const accessKeyId = getString(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = getString(process.env.R2_SECRET_ACCESS_KEY);

  const enabled = Boolean(endpoint && bucket && accessKeyId && secretAccessKey);

  return {
    enabled,
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

function getR2Client() {
  if (mongoCache.__invistimoR2Client) {
    return mongoCache.__invistimoR2Client;
  }

  const config = getR2Config();

  if (!config.enabled) {
    throw new Error("R2 configuration is missing");
  }

  mongoCache.__invistimoR2Client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return mongoCache.__invistimoR2Client;
}

function sanitizeKeyPart(value: unknown, fallback = "unknown") {
  const clean =
    getString(value)
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120) || fallback;

  return clean;
}

function getExtensionFromContentType(contentType: string) {
  const lower = contentType.toLowerCase();

  if (lower.includes("mpeg") || lower.includes("mp3")) return "mp3";
  if (lower.includes("wav")) return "wav";
  if (lower.includes("webm")) return "webm";
  if (lower.includes("ogg")) return "ogg";
  if (lower.includes("mp4")) return "mp4";
  if (lower.includes("aac")) return "aac";

  return "";
}

function getExtensionFromUrl(url: string) {
  const cleanUrl = url.split("?")[0] || "";
  const match = cleanUrl.match(/\.([a-z0-9]{2,6})$/i);
  return match?.[1]?.toLowerCase() || "";
}

function getContentTypeFromFormat(format: unknown) {
  const clean = getString(format).toLowerCase();

  if (clean === "mp3") return "audio/mpeg";
  if (clean === "wav") return "audio/wav";
  if (clean === "webm") return "audio/webm";
  if (clean === "ogg") return "audio/ogg";

  return "";
}

function buildRecordingKey(params: {
  recordingId: string;
  callSessionId: string;
  recordedAt: Date;
  contentType: string;
  sourceUrl: string;
  format?: string;
}) {
  const year = String(params.recordedAt.getFullYear());
  const month = String(params.recordedAt.getMonth() + 1).padStart(2, "0");
  const day = String(params.recordedAt.getDate()).padStart(2, "0");

  const baseName = sanitizeKeyPart(
    params.recordingId || params.callSessionId || Date.now(),
    "recording"
  );

  const extension =
    getExtensionFromContentType(params.contentType) ||
    getString(params.format).toLowerCase() ||
    getExtensionFromUrl(params.sourceUrl) ||
    "mp3";

  return `call-recordings/${year}/${month}/${day}/${baseName}.${extension}`;
}

function normalizeMetadata(value: unknown) {
  return getString(value).replace(/[^\x20-\x7E]/g, "").slice(0, 500);
}

async function uploadRecordingToR2(params: {
  recordingUrl: string;
  recordingId: string;
  callControlId: string;
  callSessionId: string;
  callLegId: string;
  eventId: string;
  recordedAt: Date;
  format?: string;
}) {
  const config = getR2Config();

  if (!config.enabled) {
    return {
      ok: false,
      reason: "R2_NOT_CONFIGURED",
    } satisfies R2UploadResult;
  }

  if (!params.recordingUrl) {
    return {
      ok: false,
      reason: "RECORDING_URL_MISSING",
    } satisfies R2UploadResult;
  }

  try {
    const response = await fetch(params.recordingUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");

      return {
        ok: false,
        reason: "TELNYX_RECORDING_DOWNLOAD_FAILED",
        details: {
          status: response.status,
          body: details.slice(0, 1000),
        },
      } satisfies R2UploadResult;
    }

    const headerContentType = getString(response.headers.get("content-type"));
    const fallbackContentType = getContentTypeFromFormat(params.format);
    const contentType = headerContentType || fallbackContentType || "audio/mpeg";

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) {
      return {
        ok: false,
        reason: "TELNYX_RECORDING_EMPTY_FILE",
      } satisfies R2UploadResult;
    }

    const key = buildRecordingKey({
      recordingId: params.recordingId,
      callSessionId: params.callSessionId,
      recordedAt: params.recordedAt,
      contentType,
      sourceUrl: params.recordingUrl,
      format: params.format,
    });

    const client = getR2Client();

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          provider: "telnyx",
          recordingId: normalizeMetadata(params.recordingId),
          callControlId: normalizeMetadata(params.callControlId),
          callSessionId: normalizeMetadata(params.callSessionId),
          callLegId: normalizeMetadata(params.callLegId),
          eventId: normalizeMetadata(params.eventId),
          uploadedBy: "invistimo-webhook",
        },
      })
    );

    return {
      ok: true,
      storage: "r2",
      bucket: config.bucket,
      key,
      contentType,
      sizeBytes: buffer.byteLength,
      uploadedAt: new Date(),
    } satisfies R2UploadResult;
  } catch (error) {
    console.error("UPLOAD RECORDING TO R2 FAILED:", error);

    return {
      ok: false,
      reason: "R2_UPLOAD_FAILED",
      details: error instanceof Error ? error.message : error,
    } satisfies R2UploadResult;
  }
}

/* ============================================================
   Telnyx actions
============================================================ */

async function telnyxCallAction(
  callControlId: string,
  action: "answer" | "speak" | "hangup" | "record_start" | "record_stop",
  body: Record<string, unknown> = {}
) {
  const apiKey = getTelnyxApiKey();

  if (!apiKey) {
    console.warn(`TELNYX_API_KEY is missing. Could not run action: ${action}`);
    return {
      ok: false,
      status: 500,
      data: { error: "TELNYX_API_KEY_MISSING" },
    };
  }

  if (!callControlId) {
    console.warn(`callControlId is missing. Could not run action: ${action}`);
    return {
      ok: false,
      status: 400,
      data: { error: "CALL_CONTROL_ID_MISSING" },
    };
  }

  const res = await fetch(
    `https://api.telnyx.com/v2/calls/${encodeURIComponent(
      callControlId
    )}/actions/${action}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = (await res.json().catch(() => null)) as
    | TelnyxActionResponse
    | null;

  if (!res.ok) {
    console.error(`TELNYX ${action.toUpperCase()} FAILED:`, {
      status: res.status,
      data: JSON.stringify(data, null, 2),
    });

    return {
      ok: false,
      status: res.status,
      data,
    };
  }

  console.log(`TELNYX ${action.toUpperCase()} SUCCESS:`, data);

  return {
    ok: true,
    status: res.status,
    data,
  };
}

async function answerIncomingCall(callControlId: string) {
  return telnyxCallAction(callControlId, "answer", {});
}

async function speakToCall(callControlId: string, text: string) {
  return telnyxCallAction(callControlId, "speak", {
    payload: text,
    language: process.env.TELNYX_GREETING_LANGUAGE || "he-IL",
    voice: process.env.TELNYX_GREETING_VOICE || "female",
  });
}

async function startRecording(callControlId: string) {
  const channels = process.env.TELNYX_RECORDING_CHANNELS || "single";
  const format = process.env.TELNYX_RECORDING_FORMAT || "wav";

  return telnyxCallAction(callControlId, "record_start", {
    channels,
    format,
  });
}

/* ============================================================
   Recording helpers
============================================================ */

function getRecordingUrls(payload: TelnyxVoicePayload) {
  const urls = payload.recording_urls;

  if (!urls || typeof urls !== "object") {
    const recordingUrl = getString(payload.recording_url);

    return {
      mp3: recordingUrl.endsWith(".mp3") ? recordingUrl : "",
      wav: recordingUrl.endsWith(".wav") ? recordingUrl : "",
      raw: recordingUrl,
    };
  }

  const record = urls as Record<string, unknown>;

  const mp3 =
    getString(record.mp3) ||
    getString(record.mp3_url) ||
    getString(record.recording_mp3_url);

  const wav =
    getString(record.wav) ||
    getString(record.wav_url) ||
    getString(record.recording_wav_url);

  const raw =
    getString(record.raw) ||
    getString(record.url) ||
    getString(record.recording_url) ||
    mp3 ||
    wav ||
    getString(payload.recording_url);

  return {
    mp3,
    wav,
    raw,
  };
}

function getBestRecordingUrl(payload: TelnyxVoicePayload) {
  const urls = getRecordingUrls(payload);
  return urls.mp3 || urls.wav || urls.raw || getString(payload.recording_url);
}

function getRecordingId(params: {
  event?: TelnyxVoiceData;
  payload: TelnyxVoicePayload;
  status: RecordingStatus;
}) {
  const directId =
    getString(params.payload.recording_id) ||
    getString(params.payload.recordingId) ||
    getString(params.payload.id);

  if (directId) return directId;

  const eventId = getString(params.event?.id);
  if (eventId) return `${params.status}-${eventId}`;

  const callControlId = getString(params.payload.call_control_id);
  const callSessionId = getString(params.payload.call_session_id);
  const occurredAt =
    getString(params.event?.occurred_at) || new Date().toISOString();

  return `${params.status}-${callSessionId || callControlId || occurredAt}`;
}

/* ============================================================
   Mongo update logic
============================================================ */

async function updateCallLifecycleEvent(params: {
  event?: TelnyxVoiceData;
  payload: TelnyxVoicePayload;
  eventType: string;
}) {
  const { event, payload, eventType } = params;

  await connectMongo();

  const clientState = parseClientState(payload.client_state);
  const existing = await findExistingCallRecording({
    clientState,
    payload,
  });

  const occurredAt = getDate(event?.occurred_at) || new Date();

  const from = firstString(
    cleanPhone(payload.from),
    existing?.from,
    clientState.normalizedFrom,
    clientState.originalFrom
  );

  const to = firstString(
    cleanPhone(payload.to),
    existing?.to,
    clientState.normalizedTo,
    clientState.originalTo,
    clientState.destinationPhone,
    clientState.dialedPhone,
    clientState.customerPhone
  );

  const direction = resolveDirection({
    payloadDirection: payload.direction,
    clientState,
    existing,
    from,
    to,
  });

  const set: Record<string, unknown> = {
    provider: "telnyx",
    lastWebhookEvent: eventType,
    clientState,
    rawPayload: {
      event,
      payload,
    },
  };

  setIfString(set, "eventId", event?.id);
  setIfString(set, "callControlId", payload.call_control_id);
  setIfString(set, "callLegId", payload.call_leg_id);
  setIfString(set, "callSessionId", payload.call_session_id);
  setIfString(set, "connectionId", payload.connection_id);

  if (from) set.from = from;
  if (to) {
    set.to = to;
    set.customerPhone = firstString(
      clientState.customerPhone,
      existing?.customerPhone,
      to
    );
  }

  if (direction !== "unknown") {
    set.direction = direction;
  }

  const agentId = firstString(clientState.agentId, existing?.agentId);
  const agentName = firstString(clientState.agentName, existing?.agentName);
  const agentEmail = firstString(clientState.agentEmail, existing?.agentEmail);

  if (agentId) set.agentId = agentId;
  if (agentName) set.agentName = agentName;
  if (agentEmail) set.agentEmail = agentEmail;

  const customerId = firstString(clientState.customerId, existing?.customerId);
  const customerName = firstString(
    clientState.customerName,
    existing?.customerName
  );

  if (customerId) set.customerId = customerId;
  if (customerName) set.customerName = customerName;

  const existingStartedAt = getDate(existing?.startedAt);
  const existingAnsweredAt = getDate(existing?.answeredAt);
  const existingEndedAt = getDate(existing?.endedAt);

  const payloadStartAt = getDate(payload.start_time);
  const payloadEndAt = getDate(payload.end_time);

  if (eventType === "call.initiated") {
    set.callStatus = "initiated";
    set.telnyxCallStatus = getString(payload.state) || "initiated";
    set.startedAt = existingStartedAt || payloadStartAt || occurredAt;
  }

  if (eventType === "call.answered") {
    set.callStatus = "answered";
    set.telnyxCallStatus = getString(payload.state) || "answered";
    set.startedAt = existingStartedAt || payloadStartAt || occurredAt;
    set.answeredAt = existingAnsweredAt || occurredAt;
  }

  if (eventType === "call.hangup") {
    const endedAt = payloadEndAt || occurredAt;
    const startedAt =
      existingStartedAt ||
      payloadStartAt ||
      getDate(existing?.createdAt) ||
      null;

    const answeredAt = existingAnsweredAt || null;

    const payloadDuration =
      getNumber(payload.duration_secs) || getNumber(payload.duration);

    const durationSeconds =
      payloadDuration ||
      diffSeconds(answeredAt || startedAt, endedAt) ||
      getNumber(existing?.durationSeconds);

    set.startedAt = startedAt;
    set.answeredAt = answeredAt;
    set.endedAt = existingEndedAt || endedAt;
    set.durationSeconds = durationSeconds;
    set.hangupCause = getString(payload.hangup_cause);
    set.hangupSource = getString(payload.hangup_source);
    set.telnyxCallStatus = getString(payload.state) || "hangup";
    set.callStatus = mapHangupToCallStatus({
      hangupCause: getString(payload.hangup_cause),
      answeredAt,
      durationSeconds,
      direction,
    });
  }

  
  const filter = buildUpdateFilter({
    existing,
    clientState,
    payload,
    eventId: event?.id,
  });

  const updated = await CallRecording.findOneAndUpdate(
  filter,
  {
    $set: set,
    $setOnInsert: {
      source: "webhook",
      recordingStatus: "pending",
      recordingId: "",
    },
  },
  {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  }
);
  console.log("CALL LIFECYCLE UPDATED:", {
    eventType,
    mongoId: updated?._id?.toString?.(),
    callStatus: updated?.callStatus,
    direction: updated?.direction,
    durationSeconds: updated?.durationSeconds,
    from,
    to,
    agentName: updated?.agentName,
    agentEmail: updated?.agentEmail,
  });

  return updated;
}

async function saveRecordingEvent(params: {
  event?: TelnyxVoiceData;
  payload: TelnyxVoicePayload;
  status: RecordingStatus;
}) {
  const { event, payload, status } = params;

  await connectMongo();

  const clientState = parseClientState(payload.client_state);
  const recordingUrls = getRecordingUrls(payload);
  const recordingId = getRecordingId({ event, payload, status });

  const existing = await findExistingCallRecording({
    clientState,
    payload,
    recordingId,
  });

  const from = firstString(
    cleanPhone(payload.from),
    existing?.from,
    clientState.normalizedFrom,
    clientState.originalFrom
  );

  const to = firstString(
    cleanPhone(payload.to),
    existing?.to,
    clientState.normalizedTo,
    clientState.originalTo,
    clientState.destinationPhone,
    clientState.dialedPhone,
    clientState.customerPhone
  );

  const direction = resolveDirection({
    payloadDirection: payload.direction,
    clientState,
    existing,
    from,
    to,
  });

  const payloadDuration =
    getNumber(payload.duration_secs) || getNumber(payload.duration);

  const recordedAt =
    getDate(payload.recording_ended_at) ||
    getDate(payload.end_time) ||
    getDate(event?.occurred_at) ||
    new Date();

  const existingStartedAt = getDate(existing?.startedAt);
  const existingAnsweredAt = getDate(existing?.answeredAt);
  const existingEndedAt = getDate(existing?.endedAt);

  const startedAt =
    existingStartedAt ||
    getDate(payload.recording_started_at) ||
    getDate(payload.start_time) ||
    null;

  const endedAt =
    existingEndedAt ||
    getDate(payload.recording_ended_at) ||
    getDate(payload.end_time) ||
    recordedAt;

  const durationSeconds =
    getNumber(existing?.durationSeconds) ||
    payloadDuration ||
    diffSeconds(existingAnsweredAt || startedAt, endedAt);

  const legacyRecordingUrl = getBestRecordingUrl(payload);

  let r2Upload: R2UploadResult = {
    ok: false,
    reason: "NOT_ATTEMPTED",
  };

  if (status === "saved" && legacyRecordingUrl) {
    r2Upload = await uploadRecordingToR2({
      recordingUrl: legacyRecordingUrl,
      recordingId,
      callControlId: getString(payload.call_control_id),
      callSessionId: getString(payload.call_session_id),
      callLegId: getString(payload.call_leg_id),
      eventId: getString(event?.id),
      recordedAt,
      format: getString(payload.format),
    });
  }

  const existingCallStatus = getCallStatusFromExisting(existing?.callStatus);

  const callStatus: CallStatus =
    status === "failed"
      ? "failed"
      : existingCallStatus !== "unknown"
        ? existingCallStatus
        : durationSeconds > 0 || existingAnsweredAt
          ? "completed"
          : "unknown";

  const update: Record<string, unknown> = {
    provider: "telnyx",
    source: existing?.source || "webhook",

    eventId: getString(event?.id),
    recordingId,
    recordingStatus: status,

    recordingUrl: legacyRecordingUrl,
    recordingUrls,

    callStatus,
    lastWebhookEvent: getString(event?.event_type) || `recording.${status}`,

    from,
    to,
    direction,

    agentId: firstString(clientState.agentId, existing?.agentId),
    agentName: firstString(clientState.agentName, existing?.agentName),
    agentEmail: firstString(clientState.agentEmail, existing?.agentEmail),

    customerId: firstString(clientState.customerId, existing?.customerId),
    customerName: firstString(clientState.customerName, existing?.customerName),
    customerPhone: firstString(
      clientState.customerPhone,
      existing?.customerPhone,
      direction === "inbound" ? from : to
    ),

    startedAt,
    answeredAt: existingAnsweredAt || null,
    endedAt,
    recordedAt,
    durationSeconds,

    clientState,
    rawPayload: {
      event,
      payload,
    },

    recordingStorageStatus: r2Upload.ok ? "saved" : r2Upload.reason,
    recordingStorageError: r2Upload.ok
      ? ""
      : JSON.stringify(r2Upload.details || ""),
  };

  setIfString(update, "callControlId", payload.call_control_id);
  setIfString(update, "callLegId", payload.call_leg_id);
  setIfString(update, "callSessionId", payload.call_session_id);
  setIfString(update, "connectionId", payload.connection_id);

  if (r2Upload.ok) {
    update.recordingStorage = "r2";
    update.recordingBucket = r2Upload.bucket;
    update.recordingKey = r2Upload.key;
    update.recordingContentType = r2Upload.contentType;
    update.recordingSizeBytes = r2Upload.sizeBytes;
    update.recordingSavedAt = r2Upload.uploadedAt;
  }

  const filter = buildUpdateFilter({
    existing,
    clientState,
    payload,
    recordingId,
    eventId: event?.id,
  });

  const recording = await CallRecording.findOneAndUpdate(
    filter,
    { $set: update },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  console.log("CALL RECORDING SAVED TO MONGO:", {
    recordingId,
    status,
    mongoId: recording?._id?.toString?.(),
    callStatus: recording?.callStatus,
    from,
    to,
    direction,
    durationSeconds,
    agentName: recording?.agentName,
    agentEmail: recording?.agentEmail,
    legacyRecordingUrl,
    r2Upload,
  });

  return recording;
}

/* ============================================================
   Routes
============================================================ */

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Telnyx voice webhook is alive",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TelnyxVoiceEvent;

    const event = body.data;
    const eventType = event?.event_type || "";
    const payload = (event?.payload || {}) as TelnyxVoicePayload;

    const callControlId = getString(payload.call_control_id);
    const callLegId = getString(payload.call_leg_id);
    const callSessionId = getString(payload.call_session_id);
    const connectionId = getString(payload.connection_id);
    const from = cleanPhone(payload.from);
    const to = cleanPhone(payload.to);
    const direction = getString(payload.direction);

    const inbound = isInboundCall({
      direction,
      from,
      to,
    });

    console.log("TELNYX VOICE WEBHOOK:", {
      eventId: event?.id,
      eventType,
      recordType: event?.record_type,
      callControlId,
      callLegId,
      callSessionId,
      connectionId,
      from,
      to,
      direction,
      inbound,
      occurredAt: event?.occurred_at,
    });

    switch (eventType) {
      case "call.initiated": {
        await updateCallLifecycleEvent({
          event,
          payload,
          eventType,
        });

        console.log("CALL INITIATED:", {
          from,
          to,
          direction,
          inbound,
          callControlId,
        });

        if (
          inbound &&
          callControlId &&
          getBooleanEnv("TELNYX_AUTO_ANSWER_INBOUND", false)
        ) {
          await answerIncomingCall(callControlId);
        }

        break;
      }

      case "call.answered": {
        await updateCallLifecycleEvent({
          event,
          payload,
          eventType,
        });

        console.log("CALL ANSWERED:", {
          from,
          to,
          direction,
          inbound,
          callControlId,
        });

        if (
          inbound &&
          callControlId &&
          getBooleanEnv("TELNYX_PLAY_GREETING_ON_ANSWER", false)
        ) {
          await speakToCall(
            callControlId,
            process.env.TELNYX_GREETING_TEXT ||
              "שלום, הגעתם לאינוויסטימו. מיד נחבר אתכם לנציג."
          );
        }

        if (callControlId && getBooleanEnv("TELNYX_AUTO_RECORD_CALLS", true)) {
          await startRecording(callControlId);
        }

        break;
      }

      case "call.hangup": {
        await updateCallLifecycleEvent({
          event,
          payload,
          eventType,
        });

        console.log("CALL HANGUP:", {
          from,
          to,
          direction,
          inbound,
          callControlId,
          hangupCause: payload.hangup_cause,
          hangupSource: payload.hangup_source,
        });

        break;
      }

      case "call.recording.started": {
        console.log("CALL RECORDING STARTED EVENT:", {
          eventId: event?.id,
          callControlId,
          callSessionId,
          recordingId: payload.recording_id,
        });

        await saveRecordingEvent({
          event,
          payload,
          status: "started",
        });

        break;
      }

      case "call.recording.saved": {
        console.log("CALL RECORDING SAVED EVENT:", {
          eventId: event?.id,
          callControlId,
          callSessionId,
          recordingId: payload.recording_id,
          recordingUrl: payload.recording_url,
        });

        await saveRecordingEvent({
          event,
          payload,
          status: "saved",
        });

        break;
      }

      case "call.recording.error":
      case "call.recording.failed": {
        console.log("CALL RECORDING FAILED EVENT:", {
          eventId: event?.id,
          callControlId,
          callSessionId,
          recordingId: payload.recording_id,
        });

        await saveRecordingEvent({
          event,
          payload,
          status: "failed",
        });

        break;
      }

      case "call.speak.started": {
        console.log("CALL SPEAK STARTED:", {
          from,
          to,
          callControlId,
        });

        break;
      }

      case "call.speak.ended": {
        console.log("CALL SPEAK ENDED:", {
          from,
          to,
          callControlId,
        });

        break;
      }

      case "call.bridged": {
        console.log("CALL BRIDGED:", {
          from,
          to,
          direction,
          inbound,
          callControlId,
        });

        break;
      }

      case "call.dtmf.received": {
        console.log("DTMF RECEIVED:", {
          digit: payload.digit,
          callControlId,
        });

        break;
      }

      default: {
        console.log("UNHANDLED TELNYX EVENT:", {
          eventType,
          payload,
        });

        break;
      }
    }



    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TELNYX VOICE WEBHOOK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "TELNYX_VOICE_WEBHOOK_FAILED",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}