import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import CallRecording from "@/models/CallRecording";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CallDirection = "inbound" | "outbound" | "unknown";
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
  agentId?: string;
  agentName?: string;
  agentEmail?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
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

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

  const from = cleanPhone(payload.from);
  const to = cleanPhone(payload.to);
  const direction = normalizeDirection(payload.direction);
  const durationSeconds =
    getNumber(payload.duration_secs) || getNumber(payload.duration) || 0;

  const recordedAt =
    getDate(payload.recording_ended_at) ||
    getDate(payload.end_time) ||
    getDate(event?.occurred_at) ||
    new Date();

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

  const update: Record<string, unknown> = {
    eventId: getString(event?.id),
    callControlId: getString(payload.call_control_id),
    callLegId: getString(payload.call_leg_id),
    callSessionId: getString(payload.call_session_id),
    connectionId: getString(payload.connection_id),

    recordingId,
    recordingStatus: status,

    // נשאר לדיבוג/גיבוי בלבד. לא להסתמך עליו לניגון עתידי.
    recordingUrl: legacyRecordingUrl,
    recordingUrls,

    from,
    to,
    direction,

    agentId: getString(clientState.agentId),
    agentName: getString(clientState.agentName),
    agentEmail: getString(clientState.agentEmail),

    customerId: getString(clientState.customerId),
    customerName: getString(clientState.customerName),
    customerPhone:
      getString(clientState.customerPhone) ||
      (direction === "inbound" ? from : to),

    startedAt:
      getDate(payload.recording_started_at) || getDate(payload.start_time),
    endedAt: getDate(payload.recording_ended_at) || getDate(payload.end_time),
    recordedAt,
    durationSeconds,

    provider: "telnyx",
    source: "webhook",
    rawPayload: payload,

    recordingStorageStatus: r2Upload.ok ? "saved" : r2Upload.reason,
    recordingStorageError: r2Upload.ok ? "" : JSON.stringify(r2Upload.details || ""),
  };

  if (r2Upload.ok) {
    update.recordingStorage = "r2";
    update.recordingBucket = r2Upload.bucket;
    update.recordingKey = r2Upload.key;
    update.recordingContentType = r2Upload.contentType;
    update.recordingSizeBytes = r2Upload.sizeBytes;
    update.recordingSavedAt = r2Upload.uploadedAt;
  }

  const recording = await CallRecording.findOneAndUpdate(
    { recordingId },
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
    from,
    to,
    direction,
    legacyRecordingUrl,
    r2Upload,
  });

  return recording;
}

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

      case "call.hangup": {
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