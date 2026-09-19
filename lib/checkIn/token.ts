import crypto from "crypto";

/** Opaque check-in token — never embeds PII. */
export function generateCheckInToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function isValidCheckInTokenShape(token: unknown): boolean {
  const value = String(token || "").trim();
  if (value.length < 16 || value.length > 128) return false;
  return /^[A-Za-z0-9_-]+$/.test(value);
}

/** Payload encoded in QR — token only. */
export function buildCheckInQrPayload(token: string): string {
  return String(token || "").trim();
}

export function parseCheckInQrPayload(raw: unknown): string | null {
  const text = String(raw || "").trim();
  if (!text) return null;

  // Accept bare token or URL ending with token
  if (isValidCheckInTokenShape(text)) return text;

  try {
    const url = new URL(text);
    const fromQuery =
      url.searchParams.get("t") ||
      url.searchParams.get("token") ||
      url.searchParams.get("checkInToken");
    if (fromQuery && isValidCheckInTokenShape(fromQuery)) return fromQuery.trim();

    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && isValidCheckInTokenShape(last)) return last;
  } catch {
    // not a URL
  }

  const match = /(?:checkInToken|token|t)=([A-Za-z0-9_-]{16,128})/i.exec(text);
  if (match?.[1] && isValidCheckInTokenShape(match[1])) return match[1];

  return null;
}
