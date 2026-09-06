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
