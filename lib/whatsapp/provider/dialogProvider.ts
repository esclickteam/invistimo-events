import { createHash } from "node:crypto";

import { dialogSendsArePaused } from "@/lib/whatsapp/dialogSendGate";

import {
  acceptedMessageId,
  readJson,
  templateSendError,
} from "@/lib/whatsapp/provider/errors";
import type {
  WhatsAppHeaderUploadInput,
  WhatsAppProvider,
  WhatsAppTemplateSendInput,
} from "@/lib/whatsapp/provider/types";

const MEDIA_ENDPOINT = "https://waba-v2.360dialog.io/media";
const MESSAGES_ENDPOINT = "https://waba-v2.360dialog.io/messages";

function dialogApiKey(override?: string) {
  const apiKey = String(
    override ?? process.env.WHATSAPP_API_KEY ?? process.env.D360_API_KEY ?? ""
  ).trim();
  if (!apiKey) throw new Error("Missing env var: WHATSAPP_API_KEY");
  return apiKey;
}

export function createDialogProvider(options: {
  apiKey?: string;
  fetch?: typeof fetch;
} = {}): WhatsAppProvider {
  const apiKey = dialogApiKey(options.apiKey);
  const fetchImpl = options.fetch ?? fetch;
  const accountKey = createHash("sha256").update(apiKey).digest("hex");

  return {
    id: "dialog",
    accountKey,
    async uploadHeaderMedia(input: WhatsAppHeaderUploadInput) {
      if (dialogSendsArePaused()) {
        const error = new Error("INVISTIMO_DIALOG_SEND_PAUSED");
        (error as Error & { code?: string }).code = "INVISTIMO_DIALOG_SEND_PAUSED";
        throw error;
      }
      const form = new FormData();
      form.append("messaging_product", "whatsapp");
      form.append(
        "file",
        new File([new Uint8Array(input.bytes)], input.filename, { type: input.mime })
      );
      const response = await fetchImpl(MEDIA_ENDPOINT, {
        method: "POST",
        headers: { "D360-API-KEY": apiKey },
        body: form,
      });
      const payload = await readJson(response);
      const mediaId = String(payload.id ?? "").trim();
      if (!response.ok || payload.error || !mediaId) {
        console.error("whatsapp header media upload failed", {
          provider: "dialog",
          status: response.status,
        });
        throw new Error(`WhatsApp header media upload failed (${response.status})`);
      }
      return mediaId;
    },
    async sendTemplate(input: WhatsAppTemplateSendInput) {
      if (dialogSendsArePaused()) {
        const error = new Error("INVISTIMO_DIALOG_SEND_PAUSED");
        (error as Error & { code?: string }).code = "INVISTIMO_DIALOG_SEND_PAUSED";
        throw error;
      }
      const response = await fetchImpl(MESSAGES_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "D360-API-KEY": apiKey,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: input.to,
          type: "template",
          template: {
            name: input.templateName,
            language: { code: input.languageCode },
            components: input.components,
          },
        }),
      });
      const providerResponse = await readJson(response);
      const messageId = response.ok ? acceptedMessageId(providerResponse) : "";
      if (!messageId) throw templateSendError(response.status, providerResponse);
      return { provider: "dialog" as const, messageId, providerResponse };
    },
  };
}
