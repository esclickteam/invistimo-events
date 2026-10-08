/**
 * Telnyx Call Control helpers for IVR — reuses existing TELNYX_* env credentials.
 * Does not create a second Telnyx integration.
 */

type TelnyxActionResponse = {
  data?: Record<string, unknown>;
  errors?: unknown;
};

function getTelnyxApiKey() {
  return process.env.TELNYX_API_KEY || "";
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
      body: JSON.stringify(body),
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

export async function playbackIvrAudio(
  callControlId: string,
  audioUrl: string,
  clientState?: Record<string, unknown>
) {
  return telnyxCallAction(callControlId, "playback_start", {
    audio_url: audioUrl,
    ...(clientState
      ? { client_state: encodeIvrClientState(clientState) }
      : {}),
  });
}

export async function gatherIvrUsingAudio(input: {
  callControlId: string;
  audioUrl: string;
  minimumDigits?: number;
  maximumDigits?: number;
  timeoutMillis?: number;
  terminatingDigit?: string;
  validDigits?: string;
  clientState?: Record<string, unknown>;
}) {
  return telnyxCallAction(input.callControlId, "gather_using_audio", {
    audio_url: input.audioUrl,
    minimum_digits: input.minimumDigits ?? 1,
    maximum_digits: input.maximumDigits ?? 1,
    timeout_millis: input.timeoutMillis ?? 10000,
    ...(input.terminatingDigit
      ? { terminating_digit: input.terminatingDigit }
      : {}),
    ...(input.validDigits ? { valid_digits: input.validDigits } : {}),
    ...(input.clientState
      ? { client_state: encodeIvrClientState(input.clientState) }
      : {}),
  });
}

export async function hangupIvrCall(callControlId: string) {
  return telnyxCallAction(callControlId, "hangup", {});
}

export function normalizePhoneForTelnyx(phone: unknown) {
  let raw = String(phone || "").trim();
  if (!raw) return "";

  raw = raw.replace(/[^\d+]/g, "");

  if (raw.startsWith("00")) {
    raw = `+${raw.slice(2)}`;
  }

  if (raw.startsWith("+")) return raw;

  if (raw.startsWith("972")) return `+${raw}`;

  if (raw.startsWith("0")) {
    // Israel local → E.164
    return `+972${raw.slice(1)}`;
  }

  if (raw.length === 9 && raw.startsWith("5")) return `+972${raw}`;
  if (raw.length === 8 && /^[23489]/.test(raw)) return `+972${raw}`;

  if (raw.length >= 9) return `+${raw}`;

  return raw;
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

/** Customer-facing text for a stored attempt error. Keeps the provider detail. */
export function explainIvrCallFailure(raw: unknown): string {
  const text = String(raw || "").trim();
  if (!text) return "החיוג נכשל";

  if (
    text.includes("DIAL_BLOCKED_TEST_MODE") ||
    text.includes("אין אישור חיוג חי")
  ) {
    return "השיחה לא נשלחה ל-Telnyx. חיוג חי היה חסום בשרת, ולכן אין מזהה שיחה ואין תשובת ספק.";
  }

  if (
    text.includes("TELNYX_API_KEY is missing") ||
    text.includes("TELNYX_CONNECTION_ID is missing")
  ) {
    return "השיחה לא נשלחה: חסר מפתח או מזהה חיבור של Telnyx בשרת.";
  }

  const telnyx = text.match(/TELNYX_CREATE_IVR_CALL_FAILED \((\d+)\)/);
  if (telnyx) {
    let detail = "";
    const jsonAt = text.search(/[\[{]/);
    if (jsonAt >= 0) {
      try {
        const parsed = JSON.parse(text.slice(jsonAt));
        const first = Array.isArray(parsed) ? parsed[0] : parsed;
        detail = String(first?.detail || first?.title || first?.code || "").trim();
      } catch {
        detail = "";
      }
    }
    return detail
      ? `Telnyx דחה את החיוג (${telnyx[1]}): ${detail}`
      : `Telnyx דחה את החיוג (סטטוס ${telnyx[1]}).`;
  }

  if (text === "החיוג נכשל") {
    return "החיוג נכשל לפני חיבור לספק.";
  }

  return text;
}
