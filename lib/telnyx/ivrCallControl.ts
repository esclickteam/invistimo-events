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

export async function answerIvrCall(callControlId: string) {
  return telnyxCallAction(callControlId, "answer", {});
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

  if (raw.startsWith("0") && !raw.startsWith("00")) {
    // Israel local → E.164
    raw = `+972${raw.slice(1)}`;
  }

  if (!raw.startsWith("+") && raw.length >= 9) {
    raw = `+${raw}`;
  }

  return raw;
}

/** Safety: only allow real dialing when IVR_ALLOW_LIVE_DIAL=true or number is in allowlist. */
export function isIvrDialAllowed(phoneE164: string) {
  if (process.env.IVR_ALLOW_LIVE_DIAL === "true") {
    return true;
  }

  const allowlist = String(process.env.IVR_TEST_PHONE_ALLOWLIST || "")
    .split(",")
    .map((p) => normalizePhoneForTelnyx(p))
    .filter(Boolean);

  if (!allowlist.length) {
    // Default safe: block all live dials in non-explicit mode.
    return false;
  }

  return allowlist.includes(phoneE164);
}
