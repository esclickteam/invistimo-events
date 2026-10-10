/**
 * Telnyx Call Control helpers for IVR — reuses existing TELNYX_* env credentials.
 * Does not create a second Telnyx integration.
 */

import { notePlaybackCommand } from "@/lib/calls/ivrCallTimeline";

export { explainIvrCallFailure } from "@/lib/calls/ivrDialFailure";

type TelnyxActionResponse = {
  data?: Record<string, unknown>;
  errors?: unknown;
};

function getTelnyxApiKey() {
  return process.env.TELNYX_API_KEY || "";
}

function ivrAppBaseUrl() {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  if (String(explicit).trim()) return String(explicit).replace(/\/$/, "");
  const vercelEnv = String(process.env.VERCEL_ENV || "").toLowerCase();
  const appEnv = String(process.env.APP_ENV || "").toLowerCase();
  if (vercelEnv === "production" || appEnv === "production") {
    return "https://www.invistimo.com";
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  return "";
}

function ivrWebhookUrl() {
  const explicit = String(process.env.TELNYX_IVR_WEBHOOK_URL || "").trim();
  if (explicit) return explicit;
  const base = ivrAppBaseUrl();
  return base ? `${base}/api/telnyx/ivr/webhook` : "";
}

function withIvrWebhook(body: Record<string, unknown>) {
  const webhookUrl = ivrWebhookUrl();
  if (!webhookUrl || body.webhook_url) return body;
  return {
    ...body,
    webhook_url: webhookUrl,
    webhook_url_method: "POST",
  };
}

export function encodeIvrClientState(state: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64");
}

export function decodeIvrClientState(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "string") return {};
  try {
    const json = Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function telnyxCallAction(
  callControlId: string,
  action: string,
  body: Record<string, unknown> = {}
): Promise<TelnyxActionResponse> {
  const apiKey = getTelnyxApiKey();
  if (!apiKey) {
    return { data: { error: "TELNYX_API_KEY_MISSING" } };
  }

  const res = await fetch(
    `https://api.telnyx.com/v2/calls/${encodeURIComponent(callControlId)}/actions/${action}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(withIvrWebhook(body)),
    }
  );

  const data = (await res.json().catch(() => null)) as TelnyxActionResponse | null;
  if (!res.ok) {
    console.error("TELNYX_IVR_ACTION_FAILED", {
      action,
      callControlId,
      status: res.status,
      data,
    });
  }
  return data || {};
}

export async function createIvrOutboundCall(input: {
  to: string;
  from?: string;
  clientState: Record<string, unknown>;
  webhookUrl: string;
}) {
  const apiKey = getTelnyxApiKey();
  const connectionId = process.env.TELNYX_CONNECTION_ID || "";
  const from =
    input.from || process.env.TELNYX_FROM_NUMBER || "+972555172720";

  if (!apiKey) throw new Error("TELNYX_API_KEY is missing");
  if (!connectionId) throw new Error("TELNYX_CONNECTION_ID is missing");

  const payload = {
    connection_id: connectionId,
    to: input.to,
    from,
    webhook_url: input.webhookUrl,
    webhook_url_method: "POST",
    client_state: encodeIvrClientState(input.clientState),
  };

  const res = await fetch("https://api.telnyx.com/v2/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => null)) as {
    data?: {
      call_control_id?: string;
      call_leg_id?: string;
      call_session_id?: string;
      connection_id?: string;
    };
    errors?: unknown;
  } | null;

  if (!res.ok) {
    throw new Error(
      `TELNYX_CREATE_IVR_CALL_FAILED (${res.status}): ${JSON.stringify(data?.errors || data)}`
    );
  }

  return {
    callControlId: data?.data?.call_control_id || "",
    callLegId: data?.data?.call_leg_id || "",
    callSessionId: data?.data?.call_session_id || "",
    connectionId: data?.data?.connection_id || connectionId,
    from,
    raw: data,
  };
}

export async function answerIvrCall(
  callControlId: string,
  options?: {
    webhookUrl?: string;
    clientState?: Record<string, unknown>;
  }
) {
  return telnyxCallAction(callControlId, "answer", {
    ...(options?.webhookUrl
      ? {
          webhook_url: options.webhookUrl,
          webhook_url_method: "POST",
        }
      : {}),
    ...(options?.clientState
      ? { client_state: encodeIvrClientState(options.clientState) }
      : {}),
  });
}

/** Dynamic TTS gather (inbound intro fallback when ElevenLabs audio is unavailable). */
export async function gatherIvrUsingSpeak(input: {
  callControlId: string;
  text: string;
  language?: string;
  voice?: string;
  minimumDigits?: number;
  maximumDigits?: number;
  timeoutMillis?: number;
  terminatingDigit?: string;
  validDigits?: string;
  clientState?: Record<string, unknown>;
}) {
  return telnyxCallAction(input.callControlId, "gather_using_speak", {
    payload: input.text,
    language: input.language || "he-IL",
    voice: input.voice || "female",
    minimum_digits: input.minimumDigits ?? 1,
    maximum_digits: input.maximumDigits ?? 1,
    timeout_millis: input.timeoutMillis ?? 12000,
    ...(input.terminatingDigit
      ? { terminating_digit: input.terminatingDigit }
      : {}),
    ...(input.validDigits ? { valid_digits: input.validDigits } : {}),
    ...(input.clientState
      ? { client_state: encodeIvrClientState(input.clientState) }
      : {}),
  });
}

export async function speakIvrCall(
  callControlId: string,
  text: string,
  clientState?: Record<string, unknown>
) {
  return telnyxCallAction(callControlId, "speak", {
    payload: text,
    language: "he-IL",
    voice: "female",
    ...(clientState
      ? { client_state: encodeIvrClientState(clientState) }
      : {}),
  });
}

/**
 * Why the media slot is being cleared.
 * - `none`: first intro/system after answer, or a natural next clip after the
 *   prior media already finished — never send stop. A late gather_stop /
 *   playback_stop can cancel the playback_start that follows (Telnyx race →
 *   total silence on an answered call).
 * - `open_silent_gather` / `legacy_next_clip` / `start_followup_audio`:
 *   gather_stop only, when an open gather must be closed before the next
 *   command (explicit callers only).
 * - `replace_after_input`: controlled cancel after an accepted digit.
 */
export type IvrMediaClearReason =
  | "none"
  | "open_silent_gather"
  | "start_followup_audio"
  | "replace_after_input"
  | "legacy_next_clip"
  | "release_gather";

/** True only when a controlled stage replace may cancel lingering audio. */
export function ivrClearStopsPlayback(reason: IvrMediaClearReason) {
  return reason === "replace_after_input";
}

export function ivrClearStopsGather(reason: IvrMediaClearReason) {
  return reason !== "none";
}

/** Stages that intentionally interrupt lingering gather/playback after a digit. */
const REPLACE_AFTER_INPUT_STAGES = new Set([
  "ask_count",
  "invalid_choice",
  "invalid_count",
  "thanks",
  "maybe",
]);

export function mediaClearReasonForPlaybackStage(stage: unknown): IvrMediaClearReason {
  const raw = String(stage || "").trim();
  if (REPLACE_AFTER_INPUT_STAGES.has(raw) || raw.startsWith("hangup_after")) {
    return "replace_after_input";
  }
  // Intro / system / natural next clip: no Telnyx stop before playback_start.
  return "none";
}

/**
 * Clear gather and/or playback only for the given reason.
 * Stop commands always finish before the caller starts new media.
 */
export async function clearIvrMediaSlot(
  callControlId: string,
  reason: IvrMediaClearReason
) {
  if (!callControlId || reason === "none") return;
  if (ivrClearStopsGather(reason)) {
    await stopIvrGather(callControlId).catch(() => null);
  }
  if (ivrClearStopsPlayback(reason)) {
    await stopIvrPlayback(callControlId).catch(() => null);
  }
}

export async function playbackIvrAudio(
  callControlId: string,
  audioUrl: string,
  clientState?: Record<string, unknown>,
  options?: { mediaClear?: IvrMediaClearReason }
) {
  const noted = notePlaybackCommand(clientState);
  try {
    const reason =
      options?.mediaClear ||
      mediaClearReasonForPlaybackStage(clientState?.stage);
    // Await clear fully before play so a late stop cannot cancel this start.
    await clearIvrMediaSlot(callControlId, reason);
    const started = await telnyxCallAction(callControlId, "playback_start", {
      audio_url: audioUrl,
      ...(clientState
        ? { client_state: encodeIvrClientState(clientState) }
        : {}),
    });
    console.log("IVR_PLAYBACK_START", {
      callControlId,
      stage: clientState?.stage || "",
      mediaClear: reason,
      audioUrl: String(audioUrl || "").slice(0, 160),
      failed: Boolean(started?.errors),
    });
    return started;
  } finally {
    await noted;
  }
}

export async function gatherIvrUsingAudio(input: {
  callControlId: string;
  audioUrl: string;
  minimumDigits?: number;
  maximumDigits?: number;
  timeoutMillis?: number;
  interDigitTimeoutMillis?: number;
  terminatingDigit?: string;
  validDigits?: string;
  clientState?: Record<string, unknown>;
  /** `none` on the first intro. `release_gather` only stops an open gather. */
  mediaClear?: IvrMediaClearReason;
}) {
  const noted = notePlaybackCommand(input.clientState);
  try {
    // Await any requested stop before the new audio so a late stop cannot
    // cancel it. The first intro passes `none` and sends no stop.
    await clearIvrMediaSlot(input.callControlId, input.mediaClear ?? "legacy_next_clip");
    return await telnyxCallAction(input.callControlId, "gather_using_audio", {
    audio_url: input.audioUrl,
    minimum_digits: input.minimumDigits ?? 1,
    maximum_digits: input.maximumDigits ?? 1,
    // Must outlast the prompt audio so timeout cannot fire mid-clip.
    timeout_millis: input.timeoutMillis ?? 45000,
    ...(input.interDigitTimeoutMillis
      ? { inter_digit_timeout_millis: input.interDigitTimeoutMillis }
      : {}),
    // Telnyx replays gather_using_audio by default. One try — the phase
    // machine decides whether a retry is legal. Empty terminating_digit
    // disables the default "#" terminator.
    maximum_tries: 1,
    ...(input.terminatingDigit !== undefined
      ? { terminating_digit: input.terminatingDigit }
      : {}),
    ...(input.validDigits ? { valid_digits: input.validDigits } : {}),
    ...(input.clientState
      ? { client_state: encodeIvrClientState(input.clientState) }
      : {}),
  });
  } finally {
    await noted;
  }
}

export async function hangupIvrCall(callControlId: string) {
  return telnyxCallAction(callControlId, "hangup", {});
}

export async function stopIvrPlayback(callControlId: string) {
  return telnyxCallAction(callControlId, "playback_stop", { stop: "all" });
}

export async function stopIvrGather(callControlId: string) {
  return telnyxCallAction(callControlId, "gather_stop", {});
}

/** Wait for DTMF without starting another audio file. */
export async function gatherIvrDigits(input: {
  callControlId: string;
  minimumDigits?: number;
  maximumDigits?: number;
  timeoutMillis?: number;
  interDigitTimeoutMillis?: number;
  terminatingDigit?: string;
  validDigits?: string;
  clientState?: Record<string, unknown>;
}) {
  // Silent gather after a completed playback — never stop that completed clip.
  await clearIvrMediaSlot(input.callControlId, "open_silent_gather");
  return telnyxCallAction(input.callControlId, "gather", {
    minimum_digits: input.minimumDigits ?? 1,
    maximum_digits: input.maximumDigits ?? 1,
    timeout_millis: input.timeoutMillis ?? 45000,
    ...(input.interDigitTimeoutMillis
      ? { inter_digit_timeout_millis: input.interDigitTimeoutMillis }
      : {}),
    ...(input.terminatingDigit !== undefined
      ? { terminating_digit: input.terminatingDigit }
      : {}),
    ...(input.validDigits ? { valid_digits: input.validDigits } : {}),
    ...(input.clientState
      ? { client_state: encodeIvrClientState(input.clientState) }
      : {}),
  });
}

export function normalizePhoneForTelnyx(phone: unknown) {
  let raw = String(phone || "").trim();
  if (!raw) return "";

  raw = raw.replace(/[^\d+]/g, "");

  if (raw.startsWith("00")) {
    raw = `+${raw.slice(2)}`;
  }

  let normalized = raw;
  if (!raw.startsWith("+")) {
    if (raw.startsWith("972")) normalized = `+${raw}`;
    else if (raw.startsWith("0")) normalized = `+972${raw.slice(1)}`;
    else if (raw.length === 9 && raw.startsWith("5")) normalized = `+972${raw}`;
    else if (raw.length === 8 && /^[23489]/.test(raw)) normalized = `+972${raw}`;
    else if (raw.length >= 9) normalized = `+${raw}`;
  }

  // 972 + trunk 0 (972050… or +972050…) is not a valid Israeli number.
  if (normalized.startsWith("+9720")) {
    normalized = `+972${normalized.slice(5)}`;
  }

  return normalized;
}

function isIvrAllowlisted(phoneE164: string) {
  const allowlist = String(process.env.IVR_TEST_PHONE_ALLOWLIST || "")
    .split(",")
    .map((p) => normalizePhoneForTelnyx(p))
    .filter(Boolean);

  return allowlist.includes(phoneE164);
}

/**
 * Production scheduled rounds dial through the existing Telnyx connection.
 * Preview and local runs stay blocked unless IVR_ALLOW_LIVE_DIAL=true or the
 * number is on IVR_TEST_PHONE_ALLOWLIST. IVR_ALLOW_LIVE_DIAL=false always blocks.
 */
export function isIvrDialAllowed(phoneE164: string) {
  if (process.env.IVR_ALLOW_LIVE_DIAL === "false") {
    return isIvrAllowlisted(phoneE164);
  }

  if (process.env.IVR_ALLOW_LIVE_DIAL === "true") {
    return true;
  }

  if (String(process.env.VERCEL_ENV || "").toLowerCase() === "production") {
    return true;
  }

  return isIvrAllowlisted(phoneE164);
}

/**
 * Read whether a call-control leg is still up. Never places a call.
 * Unknown means the check failed; callers must keep the slot.
 */
export async function readIvrCallLiveness(
  callControlId: string
): Promise<"alive" | "ended" | "unknown"> {
  const id = String(callControlId || "").trim();
  const apiKey = getTelnyxApiKey();
  if (!id || !apiKey) return "unknown";

  try {
    const res = await fetch(
      `https://api.telnyx.com/v2/calls/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      }
    );
    if (res.status === 404 || res.status === 410) return "ended";
    if (!res.ok) return "unknown";
    const data = (await res.json().catch(() => null)) as {
      data?: { is_alive?: unknown };
    } | null;
    if (data?.data?.is_alive === true) return "alive";
    if (data?.data?.is_alive === false) return "ended";
    return "unknown";
  } catch {
    return "unknown";
  }
}

