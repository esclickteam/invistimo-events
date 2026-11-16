import { createBizuplyProvider } from "@/lib/whatsapp/provider/bizuplyProvider";
import { createDialogProvider } from "@/lib/whatsapp/provider/dialogProvider";
import type {
  WhatsAppProvider,
  WhatsAppProviderId,
  WhatsAppTemplateSendInput,
} from "@/lib/whatsapp/provider/types";

export type { WhatsAppProvider, WhatsAppProviderId, WhatsAppTemplateSendInput };

/**
 * Active sender. Unset or "dialog" keeps 360dialog, so existing rounds do not move.
 * "bizuply" uses the Bizuply external API and that tenant's own Meta media ids.
 */
export function resolveWhatsAppProviderId(value = process.env.WHATSAPP_PROVIDER): WhatsAppProviderId {
  const raw = String(value ?? "dialog").trim().toLowerCase();
  if (raw === "bizuply" || raw === "biz") return "bizuply";
  if (raw === "" || raw === "dialog" || raw === "360dialog" || raw === "d360") return "dialog";
  throw new Error(`Unsupported WHATSAPP_PROVIDER "${raw}"`);
}

export function getWhatsAppProvider(options: {
  id?: WhatsAppProviderId;
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
} = {}): WhatsAppProvider {
  const id = options.id ?? resolveWhatsAppProviderId();
  if (id === "bizuply") {
    return createBizuplyProvider({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      fetch: options.fetch,
    });
  }
  return createDialogProvider({ apiKey: options.apiKey, fetch: options.fetch });
}

export async function sendWhatsAppTemplate(
  input: WhatsAppTemplateSendInput,
  options: { fetch?: typeof fetch; apiKey?: string } = {}
) {
  return getWhatsAppProvider(options).sendTemplate(input);
}
