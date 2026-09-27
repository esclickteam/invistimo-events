export function normalizeSmsPhone(value: string) {
  let phone = String(value || "").replace(/\D/g, "");

  if (!phone) return "";

  if (phone.startsWith("00")) {
    phone = phone.slice(2);
  }

  if (phone.startsWith("0")) {
    phone = `972${phone.slice(1)}`;
  } else if (!phone.startsWith("972")) {
    phone = `972${phone}`;
  }

  return phone;
}

export function isSendableSmsPhone(value: string) {
  const recipient = normalizeSmsPhone(value);
  return Boolean(recipient && recipient.length >= 11);
}

type SmsProviderEvidence = {
  /** Number actually sent to the provider (normalized). */
  recipient: string;
  httpStatus: number | null;
  /** Raw provider response body (truncated), kept for investigation. */
  rawResponse: string | null;
};

export type SmsSendResult =
  | ({
      ok: true;
      provider: "sms4free";
      /** SMS4Free v2: number of recipients accepted (> 0). */
      providerStatus: string;
      providerMessage: string;
      /** SMS4Free v2 does not return a message id. */
      providerMessageId: null;
    } & SmsProviderEvidence)
  | ({
      ok: false;
      provider: "sms4free";
      /**
       * PROVIDER_REJECTED | PROVIDER_HTTP_ERROR | PROVIDER_UNREACHABLE | SMS_NOT_CONFIGURED
       * | PROVIDER_OUTCOME_UNKNOWN (request may have reached the provider; never resend)
       */
      errorCode: string;
      errorMessage: string;
      providerStatus: string | null;
      /** true only when the provider explicitly failed to process (HTTP 5xx / 429). */
      retryable: boolean;
      /** true when the provider may have accepted the message but we could not confirm it. */
      outcomeUnknown: boolean;
    } & SmsProviderEvidence);

const RAW_RESPONSE_MAX = 500;

/** Network errors that prove the request never reached the provider. */
const NOT_CONNECTED_ERROR_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "UND_ERR_CONNECT_TIMEOUT",
  "CERT_HAS_EXPIRED",
]);

/**
 * SMS4Free v2 response semantics: HTTP 200 with JSON `{ status, message }`.
 * status > 0 → accepted for that many recipients; status <= 0 → rejected.
 * Anything else on HTTP 200 (non-JSON, missing status) is ambiguous.
 */
export function interpretSms4FreeResponse(httpStatus: number, raw: string) {
  let data: { status?: number | string; message?: string } | null = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  const hasStatus = data !== null && data.status !== undefined && data.status !== null && data.status !== "";
  const status = hasStatus ? Number(data!.status) : NaN;
  const providerStatus = hasStatus ? String(data!.status) : null;
  const providerMessage = String(data?.message ?? "");

  if (httpStatus < 200 || httpStatus >= 300) {
    return { kind: "http_error" as const, providerStatus, providerMessage };
  }
  if (!Number.isFinite(status)) {
    return { kind: "ambiguous" as const, providerStatus, providerMessage };
  }
  if (status > 0) {
    return { kind: "accepted" as const, providerStatus: String(status), providerMessage };
  }
  return { kind: "rejected" as const, providerStatus, providerMessage };
}

/**
 * Same SMS4Free endpoint as sendSMS, but returns a structured result
 * instead of throwing, so callers can persist provider outcomes.
 */
export async function sendSmsDetailed({
  to,
  message,
  timeoutMs = 20000,
}: {
  to: string;
  message: string;
  timeoutMs?: number;
}): Promise<SmsSendResult> {
  const key = process.env.SMS4FREE_KEY;
  const user = process.env.SMS4FREE_USER;
  const pass = process.env.SMS4FREE_PASS;
  const sender = process.env.SMS4FREE_SENDER;

  const recipient = normalizeSmsPhone(to);

  if (!key || !user || !pass || !sender) {
    return {
      ok: false,
      provider: "sms4free",
      errorCode: "SMS_NOT_CONFIGURED",
      errorMessage: "Missing SMS4FREE environment variables",
      providerStatus: null,
      retryable: false,
      outcomeUnknown: false,
      recipient,
      httpStatus: null,
      rawResponse: null,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch("https://api.sms4free.co.il/ApiSMS/v2/SendSMS", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, user, pass, sender, recipient, msg: message }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    const causeCode = String(err?.cause?.code || err?.code || "");
    const neverConnected = NOT_CONNECTED_ERROR_CODES.has(causeCode);
    return {
      ok: false,
      provider: "sms4free",
      errorCode: neverConnected ? "PROVIDER_UNREACHABLE" : "PROVIDER_OUTCOME_UNKNOWN",
      errorMessage: [err?.name === "AbortError" ? `timeout after ${timeoutMs}ms` : String(err?.message || err), causeCode]
        .filter(Boolean)
        .join(" · "),
      providerStatus: null,
      retryable: false,
      outcomeUnknown: !neverConnected,
      recipient,
      httpStatus: null,
      rawResponse: null,
    };
  }
  clearTimeout(timer);

  const raw = await res.text().catch(() => "");
  const rawResponse = raw ? raw.slice(0, RAW_RESPONSE_MAX) : null;
  const parsed = interpretSms4FreeResponse(res.status, raw);
  const evidence = { recipient, httpStatus: res.status, rawResponse };

  if (parsed.kind === "accepted") {
    return {
      ok: true,
      provider: "sms4free",
      providerStatus: parsed.providerStatus,
      providerMessage: parsed.providerMessage,
      providerMessageId: null,
      ...evidence,
    };
  }

  if (parsed.kind === "http_error") {
    return {
      ok: false,
      provider: "sms4free",
      errorCode: "PROVIDER_HTTP_ERROR",
      errorMessage: `HTTP ${res.status}: ${String(parsed.providerMessage || raw).slice(0, 300)}`,
      providerStatus: parsed.providerStatus,
      retryable: res.status >= 500 || res.status === 429,
      outcomeUnknown: false,
      ...evidence,
    };
  }

  if (parsed.kind === "ambiguous") {
    return {
      ok: false,
      provider: "sms4free",
      errorCode: "PROVIDER_OUTCOME_UNKNOWN",
      errorMessage: `HTTP ${res.status} without a provider status: ${String(raw || "(empty body)").slice(0, 300)}`,
      providerStatus: parsed.providerStatus,
      retryable: false,
      outcomeUnknown: true,
      ...evidence,
    };
  }

  return {
    ok: false,
    provider: "sms4free",
    errorCode: "PROVIDER_REJECTED",
    errorMessage: String(parsed.providerMessage || raw || `status ${parsed.providerStatus}`).slice(0, 300),
    providerStatus: parsed.providerStatus,
    retryable: false,
    outcomeUnknown: false,
    ...evidence,
  };
}

export async function sendSMS({
  to,
  message,
}: {
  to: string;
  message: string;
}) {
  const key = process.env.SMS4FREE_KEY;
  const user = process.env.SMS4FREE_USER;
  const pass = process.env.SMS4FREE_PASS;
  const sender = process.env.SMS4FREE_SENDER;

  if (!key || !user || !pass || !sender) {
    throw new Error("Missing SMS4FREE environment variables");
  }

  const recipient = normalizeSmsPhone(to);

  if (!recipient || recipient.length < 11) {
    throw new Error("Invalid SMS recipient phone");
  }

  const payload = {
    key,
    user,
    pass,
    sender,
    recipient,
    msg: message,
  };

  const res = await fetch("https://api.sms4free.co.il/ApiSMS/v2/SendSMS", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await res.text().catch(() => "");
  let data: { status?: number | string; message?: string } = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  // SMS4Free v2 returns status > 0 on success (usually 1 = messages accepted).
  // Negative/zero values are errors.
  const status = Number(data?.status);

  if (!res.ok || !Number.isFinite(status) || status <= 0) {
    console.error("SMS4Free send failed:", {
      httpStatus: res.status,
      status: data?.status,
      message: data?.message || raw,
      recipient,
    });
    throw new Error(
      `SMS4Free send failed: ${data?.message || data?.status || res.status}`,
    );
  }

  return true;
}
