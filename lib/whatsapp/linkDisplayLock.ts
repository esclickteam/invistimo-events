import mongoose, { Schema } from "mongoose";

import WhatsappQueue from "@/models/WhatsappQueue";
import {
  WHATSAPP_HEADER_PROBE_RECIPIENT,
  WHATSAPP_HEADER_PROBE_TEMPLATE,
} from "@/lib/whatsapp/headerProbe";
import {
  LINK_DISPLAY_LOCK_ID,
  LINK_DISPLAY_QUEUE_KEY,
  linkDisplayRequestBody,
  redactLinkDisplayRequest,
  type LinkDisplayLockStore,
} from "@/lib/whatsapp/linkDisplayExperiment";

const LockSchema = new Schema(
  {
    _id: { type: String, required: true },
    state: { type: String, required: true },
    messageId: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
    providerResponse: { type: Schema.Types.Mixed, default: null },
  },
  { collection: "whatsapplinkdisplaylocks", timestamps: true }
);

function LockModel() {
  return (
    mongoose.models.WhatsappLinkDisplayLock ||
    mongoose.model("WhatsappLinkDisplayLock", LockSchema)
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

/**
 * One database row. insertOne is the cross-process lock.
 * A second process gets a duplicate key and does not send.
 */
export function mongoLinkDisplayLock(): LinkDisplayLockStore {
  return {
    async claim() {
      try {
        await LockModel().create({
          _id: LINK_DISPLAY_LOCK_ID,
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
        { _id: LINK_DISPLAY_LOCK_ID },
        {
          $set: {
            state: "sent",
            messageId: result.messageId,
            providerResponse: result.providerResponse,
          },
        }
      );
      await WhatsappQueue.create({
        phone: WHATSAPP_HEADER_PROBE_RECIPIENT,
        templateName: WHATSAPP_HEADER_PROBE_TEMPLATE,
        idempotencyKey: LINK_DISPLAY_QUEUE_KEY,
        payload: {
          experiment: "link-display",
          request: redactLinkDisplayRequest(linkDisplayRequestBody()),
          providerResponse: result.providerResponse,
        },
        status: "sent",
        sentAt: new Date(),
        wamid: result.messageId,
        providerStatus: "sent",
        channel: "whatsapp",
        type: "custom",
        attempts: 1,
        maxAttempts: 1,
        lockedBy: "link-display-experiment",
      });
    },
    async fail(error) {
      await LockModel().updateOne(
        { _id: LINK_DISPLAY_LOCK_ID },
        { $set: { state: "failed", errorMessage: error.message.slice(0, 180) } }
      );
    },
  };
}
