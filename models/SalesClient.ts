import mongoose, { Schema, model, models } from "mongoose";

export type SalesClientStatus =
  | "new_lead"
  | "contacted"
  | "quote_sent"
  | "agreement_sent"
  | "agreement_signed"
  | "payment_pending"
  | "paid"
  | "lost"
  | "cancelled";

export type SalesClientSource =
  | "manual"
  | "employee"
  | "admin"
  | "facebook"
  | "website"
  | "whatsapp"
  | "phone"
  | "venue"
  | "producer"
  | "import"
  | "other";

export type SalesClientPriority = "low" | "normal" | "high" | "urgent";

export type SalesClientActivityType =
  | "created"
  | "lead_received"
  | "assigned"
  | "status_changed"
  | "note"
  | "call"
  | "whatsapp"
  | "sms"
  | "email"
  | "quote_created"
  | "quote_sent"
  | "agreement_created"
  | "agreement_sent"
  | "agreement_signed"
  | "payment_link_created"
  | "payment_pending"
  | "payment_paid"
  | "payment_failed"
  | "user_created"
  | "event_opened"
  | "updated";

export type SalesClientDocumentType = "quote" | "agreement";

export type SalesClientDocumentStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "signed"
  | "expired"
  | "cancelled";

export type SalesClientPaymentStatus =
  | "none"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

const AnySchema = Schema.Types.Mixed;

const SalesClientNoteSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    createdByName: {
      type: String,
      default: "",
      trim: true,
    },

    createdByRole: {
      type: String,
      default: "",
      trim: true,
    },

    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { _id: true, minimize: false },
);

const SalesClientActivitySchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "created",
        "lead_received",
        "assigned",
        "status_changed",
        "note",
        "call",
        "whatsapp",
        "sms",
        "email",
        "quote_created",
        "quote_sent",
        "agreement_created",
        "agreement_sent",
        "agreement_signed",
        "payment_link_created",
        "payment_pending",
        "payment_paid",
        "payment_failed",
        "user_created",
        "event_opened",
        "updated",
      ],
      default: "updated",
      index: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    fromStatus: {
      type: String,
      default: "",
      trim: true,
    },

    toStatus: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    createdByName: {
      type: String,
      default: "",
      trim: true,
    },

    createdByRole: {
      type: String,
      default: "",
      trim: true,
    },

    meta: {
      type: AnySchema,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { _id: true, minimize: false },
);

const SalesClientDocumentSnapshotSchema = new Schema(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "SalesDocument",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: ["quote", "agreement"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "signed", "expired", "cancelled"],
      default: "draft",
      index: true,
    },

    token: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    url: {
      type: String,
      default: "",
      trim: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    sentAt: {
      type: Date,
      default: null,
      index: true,
    },

    viewedAt: {
      type: Date,
      default: null,
      index: true,
    },

    signedAt: {
      type: Date,
      default: null,
      index: true,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { _id: true, minimize: false },
);

const SalesClientPaymentSnapshotSchema = new Schema(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ["none", "pending", "paid", "failed", "refunded", "cancelled"],
      default: "none",
      index: true,
    },

    provider: {
      type: String,
      default: "stripe",
      trim: true,
    },

    checkoutSessionId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    checkoutUrl: {
      type: String,
      default: "",
      trim: true,
    },

    paymentIntentId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    eventDayAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "ils",
      lowercase: true,
      trim: true,
    },

    paidAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { _id: false, minimize: false },
);

const SalesClientCurrentDealSchema = new Schema(
  {
    employeeSaleId: {
      type: Schema.Types.ObjectId,
      ref: "EmployeeSale",
      default: null,
      index: true,
    },

    packageName: {
      type: String,
      default: "",
      trim: true,
    },

    plan: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    records: {
      type: Number,
      default: 0,
      min: 0,
    },

    grossAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    originalGrossAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    stripeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    eventDayAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    netAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    commissionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentMode: {
      type: String,
      enum: ["full", "split", ""],
      default: "",
      index: true,
    },

    selectedPackage: {
      type: AnySchema,
      default: null,
    },

    upsells: {
      type: [AnySchema],
      default: [],
    },

    salesUpsells: {
      type: AnySchema,
      default: null,
    },
  },
  { _id: false, minimize: false },
);

const SalesClientLimitedOfferSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
      index: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    discountType: {
      type: String,
      enum: ["amount", "percent", "custom", ""],
      default: "",
    },

    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    startsAt: {
      type: Date,
      default: null,
      index: true,
    },

    endsAt: {
      type: Date,
      default: null,
      index: true,
    },

    appliesToEmployees: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { _id: false, minimize: false },
);

const SalesClientSchema = new Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    clientPhone: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    clientEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },

    customerIdNumber: {
      type: String,
      default: "",
      trim: true,
    },

    clientAddress: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "new_lead",
        "contacted",
        "quote_sent",
        "agreement_sent",
        "agreement_signed",
        "payment_pending",
        "paid",
        "lost",
        "cancelled",
      ],
      default: "new_lead",
      index: true,
    },

    source: {
      type: String,
      enum: [
        "manual",
        "employee",
        "admin",
        "facebook",
        "website",
        "whatsapp",
        "phone",
        "venue",
        "producer",
        "import",
        "other",
      ],
      default: "manual",
      index: true,
    },

    sourceId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    sourceName: {
      type: String,
      default: "",
      trim: true,
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
      index: true,
    },

    assignedEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    assignedEmployeeName: {
      type: String,
      default: "",
      trim: true,
    },

    assignedEmployeeEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    createdByName: {
      type: String,
      default: "",
      trim: true,
    },

    createdByRole: {
      type: String,
      default: "",
      trim: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      default: null,
      index: true,
    },

    eventName: {
      type: String,
      default: "",
      trim: true,
    },

    eventDate: {
      type: Date,
      default: null,
      index: true,
    },

    eventCity: {
      type: String,
      default: "",
      trim: true,
    },

    venueName: {
      type: String,
      default: "",
      trim: true,
    },

    interestedPackage: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    estimatedRecords: {
      type: Number,
      default: 0,
      min: 0,
    },

    estimatedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    latestEmployeeSaleId: {
      type: Schema.Types.ObjectId,
      ref: "EmployeeSale",
      default: null,
      index: true,
    },

    latestSalesDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "SalesDocument",
      default: null,
      index: true,
    },

    latestQuoteDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "SalesDocument",
      default: null,
      index: true,
    },

    latestAgreementDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "SalesDocument",
      default: null,
      index: true,
    },

    latestQuoteToken: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    latestAgreementToken: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    latestDocumentUrl: {
      type: String,
      default: "",
      trim: true,
    },

    latestPaymentUrl: {
      type: String,
      default: "",
      trim: true,
    },

    stripeCheckoutSessionId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    stripePaymentIntentId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    currentDeal: {
      type: SalesClientCurrentDealSchema,
      default: () => ({}),
    },

    latestPayment: {
      type: SalesClientPaymentSnapshotSchema,
      default: () => ({ status: "none", provider: "stripe" }),
    },

    documents: {
      type: [SalesClientDocumentSnapshotSchema],
      default: [],
    },

    notes: {
      type: [SalesClientNoteSchema],
      default: [],
    },

    activities: {
      type: [SalesClientActivitySchema],
      default: [],
    },

    limitedOffer: {
      type: SalesClientLimitedOfferSchema,
      default: () => ({}),
    },

    lastContactAt: {
      type: Date,
      default: null,
      index: true,
    },

    nextFollowUpAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    convertedAt: {
      type: Date,
      default: null,
      index: true,
    },

    lostReason: {
      type: String,
      default: "",
      trim: true,
    },

    internalTags: {
      type: [String],
      default: [],
      index: true,
    },

    meta: {
      type: AnySchema,
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

SalesClientSchema.pre("validate", function () {
  const doc = this as any;

  if (doc.clientEmail) {
    doc.clientEmail = String(doc.clientEmail).trim().toLowerCase();
  }

  if (doc.assignedEmployeeEmail) {
    doc.assignedEmployeeEmail = String(doc.assignedEmployeeEmail)
      .trim()
      .toLowerCase();
  }

  if (!doc.clientName) {
    doc.clientName = doc.clientPhone || doc.clientEmail || "לקוח ללא שם";
  }

  if (doc.eventDate && Number.isNaN(new Date(doc.eventDate).getTime())) {
    doc.eventDate = null;
  }

  if (!doc.lastActivityAt) {
    doc.lastActivityAt = new Date();
  }

  if (doc.status === "paid" && !doc.convertedAt) {
    doc.convertedAt = new Date();
  }

  if (Array.isArray(doc.internalTags)) {
    doc.internalTags = Array.from(
      new Set(
        doc.internalTags
          .map((tag: unknown) => String(tag || "").trim())
          .filter(Boolean),
      ),
    );
  }
});

SalesClientSchema.index({ status: 1, updatedAt: -1 });
SalesClientSchema.index({ source: 1, createdAt: -1 });
SalesClientSchema.index({ assignedEmployeeId: 1, status: 1, updatedAt: -1 });
SalesClientSchema.index({ assignedEmployeeId: 1, nextFollowUpAt: 1 });
SalesClientSchema.index({ clientPhone: 1, clientEmail: 1 });
SalesClientSchema.index({ eventDate: 1, status: 1 });
SalesClientSchema.index({ latestEmployeeSaleId: 1 });
SalesClientSchema.index({ latestSalesDocumentId: 1 });
SalesClientSchema.index({ stripePaymentIntentId: 1 });
SalesClientSchema.index({ "latestPayment.status": 1, updatedAt: -1 });
SalesClientSchema.index({ "limitedOffer.enabled": 1, "limitedOffer.endsAt": 1 });

const SalesClient = models.SalesClient || model("SalesClient", SalesClientSchema);

export default SalesClient;
