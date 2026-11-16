import { toWhatsappDigits } from "@/lib/phones/international";

/**
 * How a WhatsApp image header is attached.
 *
 * Unset, "link", "off", "0", or "false": every recipient gets header.image.link.
 * That is the production default and the immediate rollback.
 *
 * "test": header.image.id only for numbers listed in
 * WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS. Everyone else stays on the link.
 *
 * "id", "on", "1", or "true": every image header uses a media id. Do not set
 * this until a handset has shown the test recipient the full-width image.
 */

export type WhatsappHeaderMediaMode = "link" | "id";

function clean(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function whatsappHeaderMediaSetting() {
  const raw = clean(process.env.WHATSAPP_HEADER_MEDIA);
  if (raw === "id" || raw === "on" || raw === "1" || raw === "true") return "id";
  if (raw === "test" || raw === "allowlist") return "test";
  return "link";
}

export function whatsappHeaderMediaIdRecipients() {
  return String(process.env.WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS ?? "")
    .split(/[,\s]+/)
    .map((item) => toWhatsappDigits(item))
    .filter(Boolean);
}

export function resolveWhatsappHeaderMediaMode(to: string): WhatsappHeaderMediaMode {
  const setting = whatsappHeaderMediaSetting();
  if (setting === "link") return "link";
  if (setting === "id") return "id";

  const recipient = toWhatsappDigits(to);
  if (!recipient) return "link";
  return whatsappHeaderMediaIdRecipients().includes(recipient) ? "id" : "link";
}
