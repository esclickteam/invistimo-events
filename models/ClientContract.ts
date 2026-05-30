import mongoose, { Schema, model, models } from "mongoose";

const ClientContractFieldSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "signature",
        "date",
        "text",
        "fullName",
        "phone",
        "email",
        "idNumber",
        "checkbox",
        "venueNote",
      ],
      required: true,
    },

    label: {
      type: String,
      default: "",
      trim: true,
    },

    required: {
      type: Boolean,
      default: false,
    },

    pageNumber: {
      type: Number,
      default: 1,
    },

    x: {
      type: Number,
      default: 0,
    },

    y: {
      type: Number,
      default: 0,
    },

    width: {
      type: Number,
      default: 20,
    },

    height: {
      type: Number,
      default: 6,
    },

    value: {
      type: String,
      default: "",
    },

    signatureDataUrl: {
      type: String,
      default: "",
    },

    signedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const ClientContractPageSchema = new Schema(
  {
    pageNumber: {
      type: Number,
      required: true,
    },

    url: {
      type: String,
      default: "",
    },

    name: {
      type: String,
      default: "",
    },

    type: {
      type: String,
      enum: ["pdf", "image"],
      default: "pdf",
    },
  },
  { _id: false }
);

const ClientContractAuditLogSchema = new Schema(
  {
    action: {
      type: String,
      default: "",
    },

    at: {
      type: Date,
      default: Date.now,
    },

    ip: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const ClientContractSchema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      default: "הסכם לקוח",
      trim: true,
    },

    hallId: {
      type: String,
      default: "",
      index: true,
    },

    hallName: {
      type: String,
      default: "",
    },

    eventTitle: {
      type: String,
      default: "",
    },

    clientName: {
      type: String,
      default: "",
    },

    clientPhone: {
      type: String,
      default: "",
      index: true,
    },

    clientEmail: {
      type: String,
      default: "",
    },

    originalFileUrl: {
      type: String,
      required: true,
    },

    originalFileName: {
      type: String,
      default: "",
    },

    originalFileType: {
      type: String,
      enum: ["pdf", "image"],
      default: "pdf",
    },

    pageCount: {
      type: Number,
      default: 1,
    },

    pages: {
      type: [ClientContractPageSchema],
      default: [],
    },

    fields: {
      type: [ClientContractFieldSchema],
      default: [],
    },

    signingToken: {
      type: String,
      default: "",
      index: true,
    },

    signingTokenExpiresAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "signed", "locked", "cancelled", "expired"],
      default: "draft",
      index: true,
    },

    locked: {
      type: Boolean,
      default: false,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    viewedAt: {
      type: Date,
      default: null,
    },

    signedAt: {
      type: Date,
      default: null,
    },

    digitalSignatureText: {
      type: String,
      default: "",
    },

    auditLog: {
      type: [ClientContractAuditLogSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

ClientContractSchema.index({ eventId: 1, hallId: 1 });
ClientContractSchema.index({ eventId: 1, createdAt: -1 });
ClientContractSchema.index({ signingToken: 1, status: 1 });

const ClientContract =
  models.ClientContract || model("ClientContract", ClientContractSchema);

export default ClientContract;