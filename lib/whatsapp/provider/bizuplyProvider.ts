import { createHash } from "node:crypto";

import {
  acceptedMessageId,
  readJson,
  templateSendError,
} from "@/lib/whatsapp/provider/errors";
import type {
  WhatsAppHeaderUploadInput,
  WhatsAppProvider,
  WhatsAppTemplateComponent,
  WhatsAppTemplateSendInput,
} from "@/lib/whatsapp/provider/types";

export const DEFAULT_BIZUPLY_WHATSAPP_API_BASE =
  "https://api.bizuply.com/api/v1/whatsapp";

function bizuplyApiKey(override?: string) {
  const apiKey = String(override ?? process.env.BIZUPLY_WHATSAPP_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("Missing env var: BIZUPLY_WHATSAPP_API_KEY");
  return apiKey;
}

function bizuplyBase(override?: string) {
  return String(override ?? process.env.BIZUPLY_WHATSAPP_API_BASE ?? DEFAULT_BIZUPLY_WHATSAPP_API_BASE)
    .trim()
    .replace(/\/$/, "");
}

function textParameters(component: WhatsAppTemplateComponent | undefined) {
  return (component?.parameters || [])
    .filter((parameter) => parameter.type === "text")
    .map((parameter) => String(parameter.text ?? ""));
}

/** Bizuply's external API takes a friendly body, not a raw Cloud API payload. */
export function toBizuplyTemplateBody(input: WhatsAppTemplateSendInput) {
  const body = input.components.find((component) => component.type === "body");
  const header = input.components.find((component) => component.type === "header");
  const buttons = input.components.filter((component) => component.type === "button");
  const image = header?.parameters?.find((parameter) => parameter.type === "image")?.image as
    | { id?: string; link?: string }
    | undefined;
  const buttonUrlParams = buttons.flatMap((component) => textParameters(component));
  const friendly: Record<string, unknown> = {
    to: input.to,
    template: input.templateName,
    language: input.languageCode,
    parameters: textParameters(body),
  };
  if (image?.id) friendly.header = { image: { id: String(image.id) } };
  else if (image?.link) friendly.header = { image: { link: String(image.link) } };
  if (buttonUrlParams.length) friendly.buttonUrlParams = buttonUrlParams;
  return friendly;
}

export function createBizuplyProvider(options: {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
} = {}): WhatsAppProvider {
  const apiKey = bizuplyApiKey(options.apiKey);
  const baseUrl = bizuplyBase(options.baseUrl);
  const fetchImpl = options.fetch ?? fetch;
  const accountKey = createHash("sha256")
    .update(apiKey)
    .update("\0")
    .update(baseUrl)
    .digest("hex");

  return {
    id: "bizuply",
    accountKey,
    async uploadHeaderMedia(input: WhatsAppHeaderUploadInput) {
      const form = new FormData();
      form.append(
        "file",
        new File([new Uint8Array(input.bytes)], input.filename, { type: input.mime })
      );
      const response = await fetchImpl(`${baseUrl}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      const payload = await readJson(response);
      const mediaId = String(payload.id ?? payload.mediaId ?? "").trim();
      if (!response.ok || payload.success === false || payload.error || !mediaId) {
        console.error("whatsapp header media upload failed", {
          provider: "bizuply",
          status: response.status,
        });
        throw new Error(`WhatsApp header media upload failed (${response.status})`);
      }
      return mediaId;
    },
    async sendTemplate(input: WhatsAppTemplateSendInput) {
      const response = await fetchImpl(`${baseUrl}/messages/template`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toBizuplyTemplateBody(input)),
      });
      const raw = await readJson(response);
      const messageId = response.ok ? acceptedMessageId(raw) : "";
      if (!messageId) throw templateSendError(response.status, raw);
      const providerResponse =
        raw && typeof raw === "object" && raw.messages?.[0]?.id
          ? raw
          : { ...raw, messages: [{ id: messageId }] };
      return { provider: "bizuply" as const, messageId, providerResponse };
    },
    async sendText(input) {
      const response = await fetchImpl(`${baseUrl}/messages/text`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: input.to, text: input.body }),
      });
      const raw = await readJson(response);
      const messageId = response.ok ? acceptedMessageId(raw) : "";
      if (!messageId) throw templateSendError(response.status, raw);
      return { provider: "bizuply" as const, messageId, providerResponse: raw };
    },
  };
}
