/**
 * The new WhatsApp engine stays off until a person turns it on.
 * Unset, empty, and every other value keep the legacy worker.
 * This module is not imported by the cron or the scheduled worker.
 */

export type WhatsappEngineMode = "legacy" | "shadow" | "v2";

export function whatsappEngineMode(
  value: unknown = process.env.WHATSAPP_ENGINE
): WhatsappEngineMode {
  const mode = String(value ?? "").trim().toLowerCase();
  if (mode === "shadow" || mode === "v2") return mode;
  return "legacy";
}
