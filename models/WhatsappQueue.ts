import { Schema, models, model, Model, Document } from "mongoose";

/* ================= Types ================= */

export interface WhatsappQueueDoc extends Document {
  invitationId: Schema.Types.ObjectId;
  guestId?: Schema.Types.ObjectId;
  phone: string;
  templateName: string;
  payload: Record<string, any>;
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number;
  lastError?: string;
  sentAt?: Date;
  wamid?: string;
}

/* ================= Helpers ================= */

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "972" + p.slice(1);
  return p;
}

/* ================= Schema ================= */

const WhatsappQueueSchema = new Schema<WhatsappQueueDoc>(
  {
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },

    guestId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationGuest",
      index: true,
    },

    phone: {
      type: String,
      required: true,
      index: true,
    },

    templateName: {
      type: String,
      required: true,
      index: true,
    },

    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "sending", "sent", "failed"],
      default: "pending",
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    lastError: String,

    sentAt: Date,

    wamid: String,
  },
  {
    timestamps: true,
  }
);

/* ================= Indexes ================= */

// 🔒 מונע כפילויות לחלוטין
WhatsappQueueSchema.index(
  { invitationId: 1, phone: 1, templateName: 1 },
  { unique: true }
);

// אינדקס ל־cron
WhatsappQueueSchema.index({ status: 1, createdAt: 1 });

/* ================= Hooks ================= */

// ⚠️ שים לב לטיפוס של this
WhatsappQueueSchema.pre("validate", function (this: WhatsappQueueDoc) {
  if (this.phone) {
    this.phone = normalizePhone(this.phone);
  }
});

/* ================= Export ================= */

const WhatsappQueue: Model<WhatsappQueueDoc> =
  models.WhatsappQueue ||
  model<WhatsappQueueDoc>("WhatsappQueue", WhatsappQueueSchema);

export default WhatsappQueue;