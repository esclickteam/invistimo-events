export function acceptedMessageId(body: any) {
  if (!body || typeof body !== "object" || body.error || body.success === false) return "";
  const metaId = body.metaMessageId ?? body.messages?.[0]?.id;
  const bizuplyId = body.messageId;
  const id = metaId || bizuplyId;
  if (id == null) return "";
  return String(id).trim();
}

export function isRejectedMediaId(status: number, body: any) {
  const error = body?.error && typeof body.error === "object" ? body.error : {};
  const code = String(error.code ?? "");
  const text = [error.message, error.error_data?.details, error.error_user_msg, error.details, body?.raw]
    .filter((part) => part != null && String(part).trim())
    .join(" ")
    .toLowerCase();
  if (code === "131053" || code === "META_MEDIA_UPLOAD_FAILED") return true;
  if (!/media|image\['id'\]|image\.id|param image/.test(text)) return false;
  return (
    status === 404 ||
    /expir|invalid|not a valid|does not exist|not found|deleted|unknown|no longer/.test(text)
  );
}

export function templateSendError(status: number, body: any) {
  const accepted = status >= 200 && status < 300;
  const error: any = new Error(
    accepted
      ? "WhatsApp template send was not accepted"
      : `WhatsApp template send failed (${status}): ${JSON.stringify(body)}`
  );
  error.httpStatus = status;
  error.providerResponse = body;
  error.mediaRejected = isRejectedMediaId(status, body);
  return error;
}

export async function readJson(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
