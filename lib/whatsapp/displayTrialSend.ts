import mongoose, { Schema } from "mongoose";

import WhatsappQueue from "@/models/WhatsappQueue";
import { legacyDialogProbeAllowed } from "@/lib/whatsapp/dialogSendGate";
import { createDialogProvider } from "@/lib/whatsapp/provider/dialogProvider";
import {
  WHATSAPP_HEADER_PROBE_IMAGE_URL,
  WHATSAPP_HEADER_PROBE_RECIPIENT,
} from "@/lib/whatsapp/headerProbe";
import { DISPLAY_TRIAL_TEMPLATE_NAME } from "@/lib/whatsapp/displayTrialTemplate";
import type { LinkDisplayLockStore } from "@/lib/whatsapp/linkDisplayExperiment";

export const DISPLAY_TRIAL_SEND_LOCK_ID = "display-trial-send";
export const DISPLAY_TRIAL_SEND_QUEUE_KEY = "whatsapp:display-trial-send:one";
const BUTTON_SUFFIX = "header-probe?token=display";

export function displayTrialSendBody() {
  return {
    messaging_product: "whatsapp" as const,
    to: WHATSAPP_HEADER_PROBE_RECIPIENT,
    type: "template" as const,
    template: {
      name: DISPLAY_TRIAL_TEMPLATE_NAME,
      language: { code: "he" as const },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: { link: WHATSAPP_HEADER_PROBE_IMAGE_URL },
            },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: "בדיקת תצוגה" },
            { type: "text", text: "16.11.2026" },
            { type: "text", text: "בדיקה" },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: BUTTON_SUFFIX }],
        },
      ],
    },
  };
}

export function displayTrialSendAllowed(body = displayTrialSendBody()) {
  const name = body.template.name as string;
  const headerParameter = body.template.components[0].parameters[0] as {
    image?: { link?: string; id?: string };
  };
  const buttonParameter = body.template.components[2].parameters[0] as { text?: string };
  const header = headerParameter.image;
  return (
    body.to === WHATSAPP_HEADER_PROBE_RECIPIENT &&
    name === DISPLAY_TRIAL_TEMPLATE_NAME &&
    header?.link === WHATSAPP_HEADER_PROBE_IMAGE_URL &&
    header.id == null &&
    buttonParameter.text === BUTTON_SUFFIX &&
    body.template.components[1].parameters.length === 3
  );
}

const LockSchema = new Schema(
  {
    _id: { type: String, required: true },
    state: { type: String, required: true },
    messageId: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
  },
  { collection: "whatsapplinkdisplaylocks", timestamps: true }
);

function LockModel() {
  return (
    mongoose.models.WhatsappDisplayTrialSendLock ||
    mongoose.model("WhatsappDisplayTrialSendLock", LockSchema)
  );
}

function duplicateKey(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
  );
}

export function mongoDisplayTrialSendLock(): LinkDisplayLockStore {
  return {
    async claim() {
      try {
        await LockModel().create({
          _id: DISPLAY_TRIAL_SEND_LOCK_ID,
          state: "claimed",
        });
        return "claimed";
      } catch (error) {
        if (duplicateKey(error)) return "already";
        throw error;
      }
    },
    async complete(result) {
      await LockModel().updateOne(
        { _id: DISPLAY_TRIAL_SEND_LOCK_ID },
        { $set: { state: "sent", messageId: result.messageId } }
      );
      const body = displayTrialSendBody();
      await WhatsappQueue.create({
        phone: body.to,
        templateName: body.template.name,
        idempotencyKey: DISPLAY_TRIAL_SEND_QUEUE_KEY,
        payload: {
          experiment: "display-trial-send",
          request: {
            ...body,
            to: "[redacted]",
            template: {
              ...body.template,
              components: body.template.components.map((component) => {
                if (component.type !== "button") return component;
                return {
                  ...component,
                  parameters: [{ type: "text", text: "header-probe?token=[redacted]" }],
                };
              }),
            },
          },
        },
        status: "sent",
        sentAt: new Date(),
        wamid: result.messageId,
        providerStatus: "sent",
        channel: "whatsapp",
        type: "custom",
        attempts: 1,
        maxAttempts: 1,
        lockedBy: "display-trial-send",
      });
    },
    async fail(error) {
      await LockModel().updateOne(
        { _id: DISPLAY_TRIAL_SEND_LOCK_ID },
        { $set: { state: "failed", errorMessage: error.message.slice(0, 180) } }
      );
    },
  };
}

export class DisplayTrialSendRefused extends Error {
  constructor() {
    super("display trial send was refused");
    this.name = "DisplayTrialSendRefused";
  }
}

export async function sendDisplayTrialOnce(
  deps: { fetch?: typeof fetch; apiKey?: string; store?: LinkDisplayLockStore } = {}
) {
  const body = displayTrialSendBody();
  if (!displayTrialSendAllowed(body) || !legacyDialogProbeAllowed()) {
    throw new DisplayTrialSendRefused();
  }
  const store = deps.store;
  if (!store) throw new DisplayTrialSendRefused();
  if ((await store.claim()) !== "claimed") throw new DisplayTrialSendRefused();
  try {
    const provider = createDialogProvider({ fetch: deps.fetch, apiKey: deps.apiKey });
    const sent = await provider.sendTemplate({
      to: body.to,
      templateName: body.template.name,
      languageCode: body.template.language.code,
      components: body.template.components,
    });
    await store.complete({
      messageId: sent.messageId,
      providerResponse: sent.providerResponse,
    });
    return sent;
  } catch (error) {
    await store.fail({ message: error instanceof Error ? error.message : "send failed" });
    throw error;
  }
}
