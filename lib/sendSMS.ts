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

export type SmsSendResult =
  | {
      ok: true;
      provider: "sms4free";
      providerStatus: string;
      providerMessage: string;
      /** SMS4Free v2 does not return a message id. */
      providerMessageId: null;
    }
  | {
      ok: false;
      provider: "sms4free";
      /** PROVIDER_REJECTED | PROVIDER_HTTP_ERROR | PROVIDER_UNREACHABLE | SMS_NOT_CONFIGURED */
      errorCode: string;
      errorMessage: string;
      providerStatus: string | null;
      /** true only when the provider explicitly failed to process (HTTP 5xx / 429). */
      retryable: boolean;
    };

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

  if (!key || !user || !pass || !sender) {
    return {
      ok: false,
      provider: "sms4free",
      errorCode: "SMS_NOT_CONFIGURED",
      errorMessage: "Missing SMS4FREE environment variables",
      providerStatus: null,
      retryable: false,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch("https://api.sms4free.co.il/ApiSMS/v2/SendSMS", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        user,
        pass,
        sender,
        recipient: normalizeSmsPhone(to),
        msg: message,
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    return {
      ok: false,
      provider: "sms4free",
      errorCode: "PROVIDER_UNREACHABLE",
      errorMessage: String(err?.message || err),
      providerStatus: null,
      retryable: false,
    };
  }
  clearTimeout(timer);

  const raw = await res.text().catch(() => "");
  let data: { status?: number | string; message?: string } = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  const status = Number(data?.status);
  const providerStatus =
    data?.status !== undefined ? String(data.status) : null;

  if (res.ok && Number.isFinite(status) && status > 0) {
    return {
      ok: true,
      provider: "sms4free",
      providerStatus: String(status),
      providerMessage: String(data?.message || ""),
      providerMessageId: null,
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      provider: "sms4free",
      errorCode: "PROVIDER_HTTP_ERROR",
      errorMessage: `HTTP ${res.status}: ${String(data?.message || raw).slice(0, 300)}`,
      providerStatus,
      retryable: res.status >= 500 || res.status === 429,
    };
  }

  return {
    ok: false,
    provider: "sms4free",
    errorCode: "PROVIDER_REJECTED",
    errorMessage: String(data?.message || raw || `status ${data?.status}`).slice(0, 300),
    providerStatus,
    retryable: false,
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
