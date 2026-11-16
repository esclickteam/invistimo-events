/**
 * Parallel WhatsApp engine.
 *
 * Production cron and the scheduled worker do not import this module.
 * WHATSAPP_ENGINE defaults to legacy. shadow plans without sending.
 * v2 sends only through a caller-supplied sender, into this store,
 * never into the live WhatsappQueue.
 */

export { whatsappEngineMode } from "@/lib/whatsapp/engine/mode";
export { readWhatsappHeader, decideWhatsappHeader, WHATSAPP_TEMPLATE_HEADER_LAYOUT } from "@/lib/whatsapp/engine/media";
export { buildEngineTemplateMessage, ENGINE_TEMPLATE_NAMES } from "@/lib/whatsapp/engine/message";
export { planWhatsappAudience, compareRecipientIds } from "@/lib/whatsapp/engine/audience";
export { createMemoryEngineStore } from "@/lib/whatsapp/engine/store";
export {
  runWhatsappEngineTick,
  executeDue,
  applyProviderWebhook,
  enqueuePlan,
  WhatsappProviderError,
} from "@/lib/whatsapp/engine/worker";
