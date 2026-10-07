/**
 * Server-only ElevenLabs Text-to-Speech.
 *
 * Reads process.env.ELEVENLABS_API_KEY only inside this module.
 * Never import this file from client components.
 * Never return, log, or serialize the API key value.
 */

import { createHash } from "crypto";

const ELEVENLABS_API_BASE =
  process.env.ELEVENLABS_API_BASE?.trim() || "https://api.elevenlabs.io";

export type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  preview_url?: string | null;
  labels?: Record<string, string>;
  category?: string | null;
};

export class ElevenLabsApiError extends Error {
  code: string;
  providerStatus: number | null;

  constructor(
    code: string,
    message: string,
    providerStatus: number | null = null
  ) {
    super(message);
    this.name = "ElevenLabsApiError";
    this.code = code;
    this.providerStatus = providerStatus;
  }
}

function getApiKey(): string {
  const key =
    process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVEN_LABS_API_KEY ||
    process.env.XI_API_KEY ||
    "";
  if (!key || !String(key).trim()) {
    throw new ElevenLabsApiError(
      "ELEVENLABS_API_KEY_MISSING",
      "ELEVENLABS_API_KEY_MISSING"
    );
  }
  return String(key).trim();
}

/** Strip any accidental secret material before surfacing errors. */
export function sanitizeElevenLabsErrorMessage(message: unknown): string {
  let text = String(message || "ELEVENLABS_REQUEST_FAILED");
  for (const envName of [
    "ELEVENLABS_API_KEY",
    "ELEVEN_LABS_API_KEY",
    "XI_API_KEY",
  ]) {
    const key = process.env[envName];
    if (key && key.length >= 8) {
      text = text.split(key).join("[REDACTED]");
    }
  }
  // Also redact common header-style leaks if a provider echoes them.
  text = text.replace(/xi-api-key["'\s:=]+[^\s"',}]+/gi, "xi-api-key:[REDACTED]");
  text = text.replace(/sk_[a-zA-Z0-9_]{8,}/g, "[REDACTED]");
  return text.slice(0, 300);
}

export function hashTtsContent(text: string, voiceId: string) {
  return createHash("sha256")
    .update(`${voiceId}\n${text}`)
    .digest("hex");
}

function classifyProviderStatus(status: number): string {
  if (status === 401) return "ELEVENLABS_UNAUTHORIZED";
  if (status === 403) return "ELEVENLABS_FORBIDDEN";
  if (status === 404) return "ELEVENLABS_NOT_FOUND";
  if (status === 422) return "ELEVENLABS_VALIDATION";
  if (status === 429) return "ELEVENLABS_RATE_LIMITED";
  return `ELEVENLABS_HTTP_${status}`;
}

function extractProviderDetail(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const detail = (data as any).detail;
  if (typeof detail === "string") return detail.slice(0, 160);
  if (Array.isArray(detail) && detail[0]?.msg) {
    return String(detail[0].msg).slice(0, 160);
  }
  if (detail && typeof detail === "object" && detail.message) {
    return String(detail.message).slice(0, 160);
  }
  if (typeof (data as any).message === "string") {
    return String((data as any).message).slice(0, 160);
  }
  return "";
}

async function elevenLabsFetch(pathWithQuery: string, init?: RequestInit) {
  const apiKey = getApiKey();
  const url = `${ELEVENLABS_API_BASE}${pathWithQuery}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "xi-api-key": apiKey,
        Accept: "application/json",
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    throw new ElevenLabsApiError(
      "ELEVENLABS_NETWORK_ERROR",
      sanitizeElevenLabsErrorMessage(
        err instanceof Error ? err.message : "network error"
      )
    );
  }

  return res;
}

function normalizeVoice(raw: any): ElevenLabsVoice | null {
  const voiceId = String(raw?.voice_id || raw?.voiceId || "").trim();
  const name = String(raw?.name || "").trim();
  if (!voiceId || !name) return null;
  return {
    voice_id: voiceId,
    name,
    preview_url: raw?.preview_url || raw?.previewUrl || null,
    labels:
      raw?.labels && typeof raw.labels === "object" ? raw.labels : {},
    category: raw?.category || null,
  };
}

/** Preferred modern endpoint (paginated). */
async function listVoicesV2(): Promise<ElevenLabsVoice[]> {
  const collected: ElevenLabsVoice[] = [];
  let nextPageToken: string | null = null;
  let page = 0;

  do {
    const params = new URLSearchParams({
      page_size: "100",
      include_total_count: "false",
    });
    if (nextPageToken) params.set("next_page_token", nextPageToken);

    const res = await elevenLabsFetch(`/v2/voices?${params.toString()}`, {
      method: "GET",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = extractProviderDetail(data);
      const code = classifyProviderStatus(res.status);
      throw new ElevenLabsApiError(
        code,
        sanitizeElevenLabsErrorMessage(
          detail
            ? `ElevenLabs v2/voices failed (${res.status}): ${detail}`
            : `ElevenLabs v2/voices failed (${res.status})`
        ),
        res.status
      );
    }

    const batch = Array.isArray(data?.voices) ? data.voices : [];
    for (const item of batch) {
      const voice = normalizeVoice(item);
      if (voice) collected.push(voice);
    }

    const hasMore = Boolean(data?.has_more);
    nextPageToken = hasMore
      ? String(data?.next_page_token || "").trim() || null
      : null;
    page += 1;
  } while (nextPageToken && page < 10);

  return collected;
}

/** Legacy endpoint — still useful as fallback for smaller workspaces. */
async function listVoicesV1(): Promise<ElevenLabsVoice[]> {
  const res = await elevenLabsFetch(`/v1/voices?show_legacy=true`, {
    method: "GET",
  });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = extractProviderDetail(data);
    const code = classifyProviderStatus(res.status);
    throw new ElevenLabsApiError(
      code,
      sanitizeElevenLabsErrorMessage(
        detail
          ? `ElevenLabs v1/voices failed (${res.status}): ${detail}`
          : `ElevenLabs v1/voices failed (${res.status})`
      ),
      res.status
    );
  }

  const batch = Array.isArray(data?.voices) ? data.voices : [];
  return batch
    .map(normalizeVoice)
    .filter((v: ElevenLabsVoice | null): v is ElevenLabsVoice => Boolean(v));
}

export async function listElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  // Prefer v2 (current API). Fall back to v1 if v2 is unavailable for the account.
  try {
    const voices = await listVoicesV2();
    if (voices.length > 0) return voices;
  } catch (err) {
    if (
      err instanceof ElevenLabsApiError &&
      (err.code === "ELEVENLABS_API_KEY_MISSING" ||
        err.code === "ELEVENLABS_UNAUTHORIZED" ||
        err.code === "ELEVENLABS_FORBIDDEN")
    ) {
      throw err;
    }
    // Continue to v1 fallback for other failures (404/422/empty/network quirks).
    console.error(
      "[elevenlabs] v2/voices failed, trying v1:",
      err instanceof ElevenLabsApiError
        ? `${err.code}${err.providerStatus ? ` status=${err.providerStatus}` : ""}`
        : sanitizeElevenLabsErrorMessage(
            err instanceof Error ? err.message : err
          )
    );
  }

  const v1Voices = await listVoicesV1();
  if (v1Voices.length === 0) {
    throw new ElevenLabsApiError(
      "ELEVENLABS_EMPTY",
      "ElevenLabs returned an empty voices list"
    );
  }
  return v1Voices;
}

export async function synthesizeElevenLabsSpeech(input: {
  text: string;
  voiceId: string;
  modelId?: string;
}): Promise<{ buffer: Buffer; contentType: string; contentHash: string }> {
  const voiceId = String(input.voiceId || "").trim();
  const text = String(input.text || "").trim();

  if (!voiceId) throw new ElevenLabsApiError("VOICE_REQUIRED", "voiceId is required");
  if (!text) throw new ElevenLabsApiError("TEXT_REQUIRED", "text is required");

  const modelId =
    input.modelId ||
    process.env.ELEVENLABS_MODEL_ID ||
    "eleven_multilingual_v2";

  const res = await elevenLabsFetch(
    `/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    let detail = "";
    try {
      detail = extractProviderDetail(JSON.parse(bodyText));
    } catch {
      detail = "";
    }
    const code = classifyProviderStatus(res.status);
    throw new ElevenLabsApiError(
      code,
      sanitizeElevenLabsErrorMessage(
        detail
          ? `ElevenLabs TTS failed (${res.status}): ${detail}`
          : `ElevenLabs TTS failed (${res.status})`
      ),
      res.status
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get("content-type") || "audio/mpeg";

  return {
    buffer,
    contentType,
    contentHash: hashTtsContent(text, voiceId),
  };
}

/** Default voice id override via env (not secret). */
export function getDefaultIvrVoiceId() {
  return (
    process.env.ELEVENLABS_DEFAULT_VOICE_ID ||
    process.env.IVR_SYSTEM_VOICE_ID ||
    ""
  );
}

export function voiceErrorToClientPayload(error: unknown): {
  error: string;
  message: string;
  providerStatus: number | null;
} {
  if (error instanceof ElevenLabsApiError) {
    const messageByCode: Record<string, string> = {
      ELEVENLABS_API_KEY_MISSING: "מפתח ElevenLabs חסר בשרת (ELEVENLABS_API_KEY)",
      ELEVENLABS_UNAUTHORIZED:
        "מפתח ElevenLabs נדחה (401) — בדקו את ה-API key ב-Production",
      ELEVENLABS_FORBIDDEN:
        "אין הרשאה ל-ElevenLabs (403) — בדקו הרשאות המפתח",
      ELEVENLABS_RATE_LIMITED: "ElevenLabs חסם זמנית בגלל Rate Limit (429)",
      ELEVENLABS_NETWORK_ERROR: "לא ניתן להתחבר ל-ElevenLabs מהשרת",
      ELEVENLABS_EMPTY: "ElevenLabs החזיר רשימת קולות ריקה",
      VOICE_REQUIRED: "חובה לבחור קול לפני יצירת קריינות",
      TEXT_REQUIRED: "חסר טקסט ליצירת קריינות",
    };
    return {
      error: error.code,
      message:
        messageByCode[error.code] ||
        `שגיאת ElevenLabs${error.providerStatus ? ` (${error.providerStatus})` : ""}`,
      providerStatus: error.providerStatus,
    };
  }

  const safe = sanitizeElevenLabsErrorMessage(
    error instanceof Error ? error.message : "VOICES_FAILED"
  );
  if (safe === "ELEVENLABS_API_KEY_MISSING") {
    return {
      error: "ELEVENLABS_API_KEY_MISSING",
      message: "מפתח ElevenLabs חסר בשרת (ELEVENLABS_API_KEY)",
      providerStatus: null,
    };
  }
  return {
    error: "VOICES_FAILED",
    message: "טעינת רשימת הקולות נכשלה",
    providerStatus: null,
  };
}
