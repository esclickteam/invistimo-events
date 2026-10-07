/**
 * Server-only ElevenLabs Text-to-Speech.
 *
 * Reads process.env.ELEVENLABS_API_KEY only inside this module.
 * Never import this file from client components.
 * Never return, log, or serialize the API key value.
 */

import { createHash } from "crypto";

/** Dynamic lookup — avoids accidental build-time inlining of secrets. */
function readEnv(name: string): string {
  const env = process.env;
  const value = env[name];
  return typeof value === "string" ? value : "";
}

const ELEVENLABS_API_BASE =
  readEnv("ELEVENLABS_API_BASE").trim() || "https://api.elevenlabs.io";

export type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  preview_url?: string | null;
  labels?: Record<string, string>;
  category?: string | null;
};

export type ElevenLabsKeyMeta = {
  present: boolean;
  length: number;
  /** First 3 chars only for shape checks (e.g. "sk_"), never enough to recover the key. */
  prefix: string;
  hasWhitespace: boolean;
  looksQuoted: boolean;
  sourceEnv: string | null;
};

export class ElevenLabsApiError extends Error {
  code: string;
  providerStatus: number | null;
  providerDetail: string | null;
  providerStatusCode: string | null;

  constructor(
    code: string,
    message: string,
    options?: {
      providerStatus?: number | null;
      providerDetail?: string | null;
      providerStatusCode?: string | null;
    }
  ) {
    super(message);
    this.name = "ElevenLabsApiError";
    this.code = code;
    this.providerStatus = options?.providerStatus ?? null;
    this.providerDetail = options?.providerDetail ?? null;
    this.providerStatusCode = options?.providerStatusCode ?? null;
  }
}

/** Normalize Vercel-pasted secrets: trim, strip BOM/quotes/newlines. */
export function normalizeSecretApiKey(raw: string): string {
  let key = String(raw || "");
  // BOM / zero-width / directional marks from copy-paste
  key = key.replace(/^\uFEFF/, "");
  key = key.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
  key = key.trim();
  // Wrapped in quotes in Vercel UI
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  // Accidental newlines/spaces inside the value
  key = key.replace(/\s+/g, "");
  return key;
}

export function getElevenLabsKeyMeta(): ElevenLabsKeyMeta {
  const candidates: Array<[string, string]> = [
    ["ELEVENLABS_API_KEY", readEnv("ELEVENLABS_API_KEY")],
    ["ELEVEN_LABS_API_KEY", readEnv("ELEVEN_LABS_API_KEY")],
    ["XI_API_KEY", readEnv("XI_API_KEY")],
  ];
  for (const [sourceEnv, raw] of candidates) {
    if (!raw) continue;
    const normalized = normalizeSecretApiKey(raw);
    if (!normalized) continue;
    return {
      present: true,
      length: normalized.length,
      prefix: normalized.slice(0, 3),
      hasWhitespace: /\s/.test(raw),
      looksQuoted:
        (raw.trim().startsWith('"') && raw.trim().endsWith('"')) ||
        (raw.trim().startsWith("'") && raw.trim().endsWith("'")),
      sourceEnv,
    };
  }
  return {
    present: false,
    length: 0,
    prefix: "",
    hasWhitespace: false,
    looksQuoted: false,
    sourceEnv: null,
  };
}

function getApiKey(): string {
  const meta = getElevenLabsKeyMeta();
  if (!meta.present) {
    throw new ElevenLabsApiError(
      "ELEVENLABS_API_KEY_MISSING",
      "ELEVENLABS_API_KEY_MISSING"
    );
  }
  const raw =
    (meta.sourceEnv ? readEnv(meta.sourceEnv) : "") ||
    readEnv("ELEVENLABS_API_KEY");
  return normalizeSecretApiKey(raw);
}

/** Strip any accidental secret material before surfacing errors. */
export function sanitizeElevenLabsErrorMessage(message: unknown): string {
  let text = String(message || "ELEVENLABS_REQUEST_FAILED");
  for (const envName of [
    "ELEVENLABS_API_KEY",
    "ELEVEN_LABS_API_KEY",
    "XI_API_KEY",
  ]) {
    const key = normalizeSecretApiKey(readEnv(envName));
    if (key && key.length >= 8) {
      text = text.split(key).join("[REDACTED]");
    }
  }
  text = text.replace(/xi-api-key["'\s:=]+[^\s"',}]+/gi, "xi-api-key:[REDACTED]");
  text = text.replace(/sk_[a-zA-Z0-9_]{8,}/g, "[REDACTED]");
  return text.slice(0, 400);
}

export function hashTtsContent(text: string, voiceId: string) {
  return createHash("sha256")
    .update(`${voiceId}\n${text}`)
    .digest("hex");
}

function classifyProviderStatus(
  status: number,
  providerStatusCode?: string | null,
  providerDetail?: string | null
): string {
  const codeBlob = `${providerStatusCode || ""} ${providerDetail || ""}`.toLowerCase();
  if (
    status === 402 ||
    /insufficient[_\s-]?credits|payment[_\s-]?required|quota|out of credits|no credits/.test(
      codeBlob
    )
  ) {
    if (/insufficient[_\s-]?credits/.test(codeBlob)) {
      return "ELEVENLABS_INSUFFICIENT_CREDITS";
    }
    return "ELEVENLABS_PAYMENT_REQUIRED";
  }
  if (status === 401) return "ELEVENLABS_UNAUTHORIZED";
  if (status === 403) return "ELEVENLABS_FORBIDDEN";
  if (status === 404) return "ELEVENLABS_NOT_FOUND";
  if (status === 422) return "ELEVENLABS_VALIDATION";
  if (status === 429) return "ELEVENLABS_RATE_LIMITED";
  return `ELEVENLABS_HTTP_${status}`;
}

function extractProviderInfo(data: unknown): {
  detail: string;
  statusCode: string | null;
} {
  if (!data || typeof data !== "object") {
    return { detail: "", statusCode: null };
  }
  const obj = data as any;
  const detail = obj.detail;

  if (typeof detail === "string") {
    return { detail: detail.slice(0, 240), statusCode: null };
  }

  if (Array.isArray(detail) && detail[0]) {
    const first = detail[0];
    const msg = String(first.msg || first.message || "").slice(0, 240);
    return { detail: msg, statusCode: first.type ? String(first.type) : null };
  }

  if (detail && typeof detail === "object") {
    const statusCode = detail.status ? String(detail.status) : null;
    const msg = String(detail.message || detail.msg || "").slice(0, 240);
    return {
      detail: msg || (statusCode ? `status=${statusCode}` : ""),
      statusCode,
    };
  }

  if (typeof obj.message === "string") {
    return { detail: obj.message.slice(0, 240), statusCode: null };
  }

  return { detail: "", statusCode: null };
}

async function elevenLabsFetch(pathWithQuery: string, init?: RequestInit) {
  const apiKey = getApiKey();
  const url = `${ELEVENLABS_API_BASE}${pathWithQuery}`;

  // Explicit header object — xi-api-key is the documented auth header.
  const headers: Record<string, string> = {
    "xi-api-key": apiKey,
    Accept: "application/json",
  };
  const extra = init?.headers;
  if (extra && typeof extra === "object" && !(extra instanceof Headers)) {
    Object.assign(headers, extra as Record<string, string>);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
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
    labels: raw?.labels && typeof raw.labels === "object" ? raw.labels : {},
    category: raw?.category || null,
  };
}

function throwFromProviderResponse(
  endpoint: string,
  res: Response,
  data: unknown
): never {
  const info = extractProviderInfo(data);
  const code = classifyProviderStatus(
    res.status,
    info.statusCode,
    info.detail
  );
  const detailPart = info.detail
    ? info.detail
    : info.statusCode
      ? `status=${info.statusCode}`
      : "";
  throw new ElevenLabsApiError(
    code,
    sanitizeElevenLabsErrorMessage(
      detailPart
        ? `ElevenLabs ${endpoint} failed (${res.status}): ${detailPart}`
        : `ElevenLabs ${endpoint} failed (${res.status})`
    ),
    {
      providerStatus: res.status,
      providerDetail: info.detail
        ? sanitizeElevenLabsErrorMessage(info.detail)
        : null,
      providerStatusCode: info.statusCode,
    }
  );
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
    if (!res.ok) throwFromProviderResponse("v2/voices", res, data);

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

  if (!res.ok) throwFromProviderResponse("v1/voices", res, data);

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
    console.error(
      "[elevenlabs] v2/voices failed, trying v1:",
      err instanceof ElevenLabsApiError
        ? `${err.code}${err.providerStatus ? ` status=${err.providerStatus}` : ""}${
            err.providerStatusCode ? ` code=${err.providerStatusCode}` : ""
          }`
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

  if (!voiceId) {
    throw new ElevenLabsApiError("VOICE_REQUIRED", "voiceId is required");
  }
  if (!text) {
    throw new ElevenLabsApiError("TEXT_REQUIRED", "text is required");
  }

  const modelId =
    input.modelId ||
    readEnv("ELEVENLABS_MODEL_ID") ||
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
    let data: unknown = null;
    try {
      data = JSON.parse(bodyText);
    } catch {
      data = bodyText ? { message: bodyText.slice(0, 200) } : null;
    }
    throwFromProviderResponse("v1/text-to-speech", res, data);
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
    readEnv("ELEVENLABS_DEFAULT_VOICE_ID") ||
    readEnv("IVR_SYSTEM_VOICE_ID") ||
    getIvrFemaleVoiceId() ||
    getIvrMaleVoiceId() ||
    ""
  );
}

/** Global Invistimo female ElevenLabs voice (system-configured, not a client picker). */
export function getIvrFemaleVoiceId() {
  return (
    readEnv("IVR_FEMALE_VOICE_ID") ||
    readEnv("ELEVENLABS_FEMALE_VOICE_ID") ||
    readEnv("ELEVENLABS_DEFAULT_VOICE_ID") ||
    readEnv("IVR_SYSTEM_VOICE_ID") ||
    ""
  ).trim();
}

/** Global Invistimo male ElevenLabs voice (system-configured, not a client picker). */
export function getIvrMaleVoiceId() {
  return (
    readEnv("IVR_MALE_VOICE_ID") ||
    readEnv("ELEVENLABS_MALE_VOICE_ID") ||
    ""
  ).trim();
}

export type IvrSystemVoiceOption = {
  gender: "female" | "male";
  label: string;
  voiceId: string;
};

/**
 * Sync env-only snapshot of the two system voices.
 * Prefer async getIvrSystemVoiceChoices() (ivrSystemVoices) which also
 * resolves Dana + Hebrew male from the account and Mongo cache.
 * Never returns the full ElevenLabs catalog.
 */
export function listIvrSystemVoiceOptions(): IvrSystemVoiceOption[] {
  const options: IvrSystemVoiceOption[] = [];
  const female = getIvrFemaleVoiceId();
  const male = getIvrMaleVoiceId();
  if (female) {
    options.push({
      gender: "female",
      label: "דנה – קול נשי",
      voiceId: female,
    });
  }
  if (male) {
    const maleName = readEnv("IVR_MALE_VOICE_NAME").trim();
    options.push({
      gender: "male",
      label: maleName ? `${maleName} – קול גברי` : "קול גברי",
      voiceId: male,
    });
  }
  return options;
}

export function getIvrVoiceIdForGender(
  gender: "female" | "male" | string | null | undefined
): string {
  const g = String(gender || "")
    .trim()
    .toLowerCase();
  if (g === "male") return getIvrMaleVoiceId();
  if (g === "female") return getIvrFemaleVoiceId();
  return getDefaultIvrVoiceId();
}

export function voiceErrorToClientPayload(error: unknown): {
  error: string;
  message: string;
  providerStatus: number | null;
  providerDetail: string | null;
  providerStatusCode: string | null;
  keyMeta: ElevenLabsKeyMeta;
  authHeader: "xi-api-key";
} {
  const keyMeta = getElevenLabsKeyMeta();
  const base = {
    keyMeta,
    authHeader: "xi-api-key" as const,
  };

  if (error instanceof ElevenLabsApiError) {
    let code = error.code;
    if (
      error.providerStatus === 402 ||
      code === "ELEVENLABS_HTTP_402" ||
      /insufficient[_\s-]?credits|payment[_\s-]?required/i.test(
        `${error.providerStatusCode || ""} ${error.providerDetail || ""}`
      )
    ) {
      code = classifyProviderStatus(
        error.providerStatus || 402,
        error.providerStatusCode,
        error.providerDetail
      );
    }

    const messageByCode: Record<string, string> = {
      ELEVENLABS_API_KEY_MISSING:
        "מפתח ElevenLabs חסר בשרת (ELEVENLABS_API_KEY) — ודאו שהוא מוגדר ל-Production ועשו Redeploy",
      ELEVENLABS_UNAUTHORIZED:
        "ElevenLabs דחה את המפתח (401). אם עדכנתם env ב-Vercel — חובה Redeploy. סיבת ElevenLabs מצורפת ב-providerDetail.",
      ELEVENLABS_FORBIDDEN:
        "אין הרשאה ל-ElevenLabs (403) — בדקו הרשאות Voices/TTS של המפתח",
      ELEVENLABS_INSUFFICIENT_CREDITS:
        "אין מספיק קרדיטים בחשבון ElevenLabs (insufficient_credits). זה הגורם לכשל — לא בעיית בחירת קול. טענו קרדיטים ב-ElevenLabs ונסו שוב.",
      ELEVENLABS_PAYMENT_REQUIRED:
        "ElevenLabs דורש תשלום / קרדיטים (402 payment_required). זה הגורם לכשל — לא בעיית בחירת קול.",
      ELEVENLABS_RATE_LIMITED: "ElevenLabs חסם זמנית בגלל Rate Limit (429)",
      ELEVENLABS_NETWORK_ERROR: "לא ניתן להתחבר ל-ElevenLabs מהשרת",
      ELEVENLABS_EMPTY: "ElevenLabs החזיר רשימת קולות ריקה",
      VOICE_REQUIRED: "חובה לבחור קול לפני יצירת קריינות",
      TEXT_REQUIRED: "חסר טקסט ליצירת קריינות",
    };

    const detailHint =
      error.providerDetail || error.providerStatusCode
        ? ` · ${[error.providerStatusCode, error.providerDetail]
            .filter(Boolean)
            .join(": ")}`
        : "";

    return {
      ...base,
      error: code,
      message: `${
        messageByCode[code] ||
        `שגיאת ElevenLabs${
          error.providerStatus ? ` (${error.providerStatus})` : ""
        }`
      }${detailHint}`,
      providerStatus: error.providerStatus,
      providerDetail: error.providerDetail,
      providerStatusCode: error.providerStatusCode,
    };
  }

  const safe = sanitizeElevenLabsErrorMessage(
    error instanceof Error ? error.message : "VOICES_FAILED"
  );
  if (safe === "ELEVENLABS_API_KEY_MISSING") {
    return {
      ...base,
      error: "ELEVENLABS_API_KEY_MISSING",
      message:
        "מפתח ElevenLabs חסר בשרת (ELEVENLABS_API_KEY) — ודאו שהוא מוגדר ל-Production ועשו Redeploy",
      providerStatus: null,
      providerDetail: null,
      providerStatusCode: null,
    };
  }
  return {
    ...base,
    error: "VOICES_FAILED",
    message: "טעינת רשימת הקולות נכשלה",
    providerStatus: null,
    providerDetail: null,
    providerStatusCode: null,
  };
}
