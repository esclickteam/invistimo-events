import mongoose, { Schema, model, models, type Model } from "mongoose";

export type SalesDocumentType = "quote" | "agreement";

export type SalesDocumentStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "signed"
  | "expired";

export type SalesPaymentMode = "full" | "split";

const AnySchema = Schema.Types.Mixed;

export type SalesDocumentModelType = {
  type: SalesDocumentType;
  token: string;
  status: SalesDocumentStatus;
  url?: string;

  client?: {
    fullName?: string;
    idNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
  };

  event?: {
    name?: string;
    date?: string;
    city?: string;
    venueName?: string;
  };

  quote?: {
    createdAt?: string;
    expiresAt?: string;
    validityDays?: number;
  };

  agreement?: {
    signatureFullName?: string;
    signatureIdNumber?: string;
    signatureAddress?: string;
    signaturePhone?: string;
    signatureDate?: string;
    signatureText?: string;
    signatureDataUrl?: string;
    acceptedTerms?: boolean;
    signedAt?: Date | null;
  };

  selectedPackage?: {
    key?: string;
    title?: string;
    customerSummary?: string;
    includes?: string[];
    records?: number;
    price?: number;
  };

  upsells?: unknown[];

  totals?: {
    grossAmount?: number;
    grossAmountBeforeDiscount?: number;
    grossAmountAfterDiscount?: number;
    discountAmount?: number;
    fullPaymentDiscount?: number;
    netAmount?: number;
    vatRate?: number;
    paymentMode?: SalesPaymentMode;
    stripeAmount?: number;
    paymentSchedule?: Record<string, unknown>;
  };

  customerDealSummary?: Record<string, unknown>;
  cancellationTerms?: unknown[];
  paymentTerms?: unknown[];

  signature?: {
    fullName?: string;
    idNumber?: string;
    address?: string;
    phone?: string;
    date?: string;
    signatureText?: string;
    signatureDataUrl?: string;
    acceptedTerms?: boolean;
    signedAt?: Date | null;
    ip?: string;
    signedIp?: string;
    userAgent?: string;
    signedUserAgent?: string;
  };

  sms?: {
    sentAt?: Date | null;
    lastTriedAt?: Date | null;
    sentTo?: string;
    normalizedSentTo?: string;
    provider?: string;
    parts?: number;
    message?: string;
    response?: string;
    lastError?: string;
  };

  stripe?: {
    checkoutUrl?: string;
    checkoutSessionId?: string;
    amount?: number;
    status?: string;
    lastError?: string;
  };

  audit?: {
    createdIp?: string;
    createdUserAgent?: string;
    viewedAt?: Date | null;
    viewedIp?: string;
    viewedUserAgent?: string;
    signedAt?: Date | null;
    signedIp?: string;
    signedUserAgent?: string;
  };

  viewedAt?: Date | null;
  viewedIp?: string;
  viewedUserAgent?: string;

  signedAt?: Date | null;

  createdByUserId?: mongoose.Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
};

const SalesDocumentSchema = new Schema<SalesDocumentModelType>(
  {
    type: {
      type: String,
      enum: ["quote", "agreement"],
      required: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "signed", "expired"],
      default: "draft",
      index: true,
    },

    url: {
      type: String,
      default: "",
      trim: true,
    },

    client: {
      fullName: { type: String, default: "", trim: true },
      idNumber: { type: String, default: "", trim: true },
      email: { type: String, default: "", trim: true, lowercase: true },
      phone: { type: String, default: "", trim: true },
      address: { type: String, default: "", trim: true },
    },

    event: {
      name: { type: String, default: "", trim: true },
      date: { type: String, default: "", trim: true },
      city: { type: String, default: "", trim: true },
      venueName: { type: String, default: "", trim: true },
    },

    quote: {
      createdAt: { type: String, default: "", trim: true },
      expiresAt: { type: String, default: "", trim: true },
      validityDays: { type: Number, default: 4 },
    },

    agreement: {
      signatureFullName: { type: String, default: "", trim: true },
      signatureIdNumber: { type: String, default: "", trim: true },
      signatureAddress: { type: String, default: "", trim: true },
      signaturePhone: { type: String, default: "", trim: true },
      signatureDate: { type: String, default: "", trim: true },
      signatureText: { type: String, default: "", trim: true },
      signatureDataUrl: { type: String, default: "" },
      acceptedTerms: { type: Boolean, default: false },
      signedAt: { type: Date, default: null },
    },

    selectedPackage: {
      key: { type: String, default: "", trim: true },
      title: { type: String, default: "", trim: true },
      customerSummary: { type: String, default: "", trim: true },
      includes: { type: [String], default: [] },
      records: { type: Number, default: 0 },
      price: { type: Number, default: 0 },
    },

    upsells: {
      type: [AnySchema],
      default: [],
    },

    totals: {
      grossAmount: { type: Number, default: 0 },

      // מחיר לפני הנחת תשלום מלא
      grossAmountBeforeDiscount: { type: Number, default: 0 },

      // מחיר אחרי הנחה, זה הסכום הסופי כולל מע"מ
      grossAmountAfterDiscount: { type: Number, default: 0 },

      // סכום הנחה, לדוגמה 5% בתשלום מלא
      discountAmount: { type: Number, default: 0 },
      fullPaymentDiscount: { type: Number, default: 0 },

      // לפני מע"מ
      netAmount: { type: Number, default: 0 },

      vatRate: { type: Number, default: 0.18 },

      // full / split
      paymentMode: {
        type: String,
        enum: ["full", "split"],
        default: "split",
      },

      // הסכום שצריך לעבור ל-Stripe עכשיו
      stripeAmount: { type: Number, default: 0 },

      paymentSchedule: {
        type: AnySchema,
        default: {},
      },
    },

    customerDealSummary: {
      type: AnySchema,
      default: {},
    },

    cancellationTerms: {
      type: [AnySchema],
      default: [],
    },

    paymentTerms: {
      type: [AnySchema],
      default: [],
    },

    signature: {
      fullName: { type: String, default: "", trim: true },
      idNumber: { type: String, default: "", trim: true },
      address: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
      date: { type: String, default: "", trim: true },

      // חתימה מוקלדת
      signatureText: { type: String, default: "", trim: true },

      // חתימה מצוירת כ-base64 data url
      signatureDataUrl: { type: String, default: "" },

      acceptedTerms: { type: Boolean, default: false },

      signedAt: { type: Date, default: null },

      // נשאר לתאימות עם קוד קודם
      ip: { type: String, default: "", trim: true },
      userAgent: { type: String, default: "", trim: true },

      // חדש וברור יותר
      signedIp: { type: String, default: "", trim: true },
      signedUserAgent: { type: String, default: "", trim: true },
    },

    sms: {
      sentAt: { type: Date, default: null },
      lastTriedAt: { type: Date, default: null },

      sentTo: { type: String, default: "", trim: true },
      normalizedSentTo: { type: String, default: "", trim: true },

      provider: { type: String, default: "", trim: true },

      parts: { type: Number, default: 0 },

      message: { type: String, default: "" },
      response: { type: String, default: "" },

      lastError: { type: String, default: "" },
    },

    stripe: {
      checkoutUrl: { type: String, default: "" },
      checkoutSessionId: { type: String, default: "" },
      amount: { type: Number, default: 0 },
      status: { type: String, default: "" },
      lastError: { type: String, default: "" },
    },

    audit: {
      createdIp: { type: String, default: "" },
      createdUserAgent: { type: String, default: "" },

      viewedAt: { type: Date, default: null },
      viewedIp: { type: String, default: "" },
      viewedUserAgent: { type: String, default: "" },

      signedAt: { type: Date, default: null },
      signedIp: { type: String, default: "" },
      signedUserAgent: { type: String, default: "" },
    },

    viewedAt: { type: Date, default: null },
    viewedIp: { type: String, default: "" },
    viewedUserAgent: { type: String, default: "" },

    signedAt: { type: Date, default: null },

    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

SalesDocumentSchema.index({ type: 1, status: 1, createdAt: -1 });
SalesDocumentSchema.index({ token: 1, type: 1 });
SalesDocumentSchema.index({ "client.phone": 1 });
SalesDocumentSchema.index({ "client.email": 1 });
SalesDocumentSchema.index({ "quote.expiresAt": 1, status: 1 });

const SalesDocument =
  (models.SalesDocument as Model<SalesDocumentModelType> | undefined) ||
  model<SalesDocumentModelType>("SalesDocument", SalesDocumentSchema);

export default SalesDocument;