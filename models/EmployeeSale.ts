import mongoose, { Schema, model, models } from "mongoose";

export type EmployeeSaleStatus =
  | "pending"
  | "paid"
  | "cancelled"
  | "refunded";

export type EmployeeSaleSource =
  | "employee_sales_page"
  | "employee_client_create"
  | "admin"
  | "manual";

export type EmployeeSalePaymentMode = "full" | "split";

export type EmployeeSalePaymentProvider = "stripe" | "manual" | "";

export type EmployeeSaleUpsellKey =
  | "digitalSeating"
  | "venueSeating"
  | "personalRepresentative"
  | "thirdRsvpRound"
  | "suppliersBudgetSystem"
  | "alcoholManagement";

const AnySchema = Schema.Types.Mixed;

const UpsellStateSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    givenFree: {
      type: Boolean,
      default: false,
    },

    staffCount: {
      type: Number,
      default: 0,
      min: 0,
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

    paymentType: {
      type: String,
      default: "",
      trim: true,
    },

    meta: {
      type: AnySchema,
      default: null,
    },
  },
  { _id: false, minimize: false },
);

const EmployeeSaleSchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employeeName: {
      type: String,
      default: "",
      trim: true,
    },

    employeeEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },

    clientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    clientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    clientPhone: {
      type: String,
      default: "",
      trim: true,
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

    packageName: {
      type: String,
      default: "",
      trim: true,
    },

    plan: {
      type: String,
      default: "premium",
      trim: true,
      index: true,
    },

    guests: {
      type: Number,
      default: 0,
      min: 0,
    },

    records: {
      type: Number,
      default: 0,
      min: 0,
    },

    grossAmount: {
      type: Number,
      required: true,
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

    vatRate: {
      type: Number,
      default: 0.18,
    },

    netAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    commissionRate: {
      type: Number,
      default: 0.05,
    },

    commissionAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    paymentMode: {
      type: String,
      enum: ["full", "split"],
      default: "split",
      index: true,
    },

    paymentProvider: {
      type: String,
      enum: ["stripe", "manual", ""],
      default: "stripe",
      index: true,
    },

    stripeCheckoutSessionId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    stripeCheckoutUrl: {
      type: String,
      default: "",
      trim: true,
    },

    stripePaymentIntentId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    stripePaidAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
      index: true,
    },

    activationSnapshot: {
      type: AnySchema,
      default: null,
    },

    payment: {
      method: {
        type: String,
        default: "stripe",
        trim: true,
      },

      provider: {
        type: String,
        default: "stripe",
        trim: true,
      },

      status: {
        type: String,
        enum: ["pending", "paid", "cancelled", "refunded", ""],
        default: "pending",
        trim: true,
      },

      mode: {
        type: String,
        enum: ["full", "split"],
        default: "split",
      },

      amount: {
        type: Number,
        default: 0,
      },

      originalAmount: {
        type: Number,
        default: 0,
      },

      discountAmount: {
        type: Number,
        default: 0,
      },

      immediateAmount: {
        type: Number,
        default: 0,
      },

      stripeAmount: {
        type: Number,
        default: 0,
      },

      eventDayAmount: {
        type: Number,
        default: 0,
      },

      checkoutSessionId: {
        type: String,
        default: "",
        trim: true,
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
      },

      paidAt: {
        type: Date,
        default: null,
      },

      lastError: {
        type: String,
        default: "",
        trim: true,
      },
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
      digitalSeating: {
        type: UpsellStateSchema,
        default: () => ({ enabled: false, price: 0, totalPrice: 0 }),
      },

      venueSeating: {
        type: UpsellStateSchema,
        default: () => ({ enabled: false, price: 0, totalPrice: 0, staffCount: 0 }),
      },

      personalRepresentative: {
        type: UpsellStateSchema,
        default: () => ({ enabled: false, price: 0, totalPrice: 0 }),
      },

      thirdRsvpRound: {
        type: UpsellStateSchema,
        default: () => ({ enabled: false, price: 0, totalPrice: 0 }),
      },

      suppliersBudgetSystem: {
        type: UpsellStateSchema,
        default: () => ({ enabled: false, price: 0, totalPrice: 0, givenFree: false }),
      },

      alcoholManagement: {
        type: UpsellStateSchema,
        default: () => ({ enabled: false, price: 0, totalPrice: 0, staffCount: 0 }),
      },
    },

    quote: {
      type: AnySchema,
      default: null,
    },

    totals: {
      type: AnySchema,
      default: null,
    },

    customerDealSummary: {
      type: AnySchema,
      default: null,
    },

    cancellationTerms: {
      type: [AnySchema],
      default: [],
    },

    paymentTerms: {
      type: [AnySchema],
      default: [],
    },

    paymentSchedule: {
      type: AnySchema,
      default: null,
    },

    saleCompliance: {
      recordedCall: {
        type: Boolean,
        default: false,
      },

      cardOwnerConfirmed: {
        type: Boolean,
        default: false,
      },

      cardHolderPresentAndApproved: {
        type: Boolean,
        default: false,
      },

      saleSummaryConfirmed: {
        type: Boolean,
        default: false,
      },

      termsConfirmed: {
        type: Boolean,
        default: false,
      },

      summary: {
        type: String,
        default: "",
        trim: true,
      },
    },

    signedAgreementToken: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    agreementToken: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    agreementDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "SalesDocument",
      default: null,
      index: true,
    },

    salesDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "SalesDocument",
      default: null,
      index: true,
    },

    agreementStatus: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    agreementSignedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },

    source: {
      type: String,
      enum: ["employee_sales_page", "employee_client_create", "admin", "manual"],
      default: "employee_sales_page",
      index: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

EmployeeSaleSchema.pre("validate", function () {
  const doc = this as any;

  if (!doc.records && doc.guests) {
    doc.records = doc.guests;
  }

  if (!doc.guests && doc.records) {
    doc.guests = doc.records;
  }

  if (doc.clientEmail) {
    doc.clientEmail = String(doc.clientEmail).trim().toLowerCase();
  }

  if (doc.employeeEmail) {
    doc.employeeEmail = String(doc.employeeEmail).trim().toLowerCase();
  }

  if (!doc.payment) {
    doc.payment = {};
  }

  doc.payment.method = doc.payment.method || "stripe";
  doc.payment.provider = doc.payment.provider || doc.paymentProvider || "stripe";
  doc.payment.status = doc.payment.status || doc.status || "pending";
  doc.payment.mode = doc.payment.mode || doc.paymentMode || "split";

  if (!doc.payment.amount) {
    doc.payment.amount = doc.grossAmount || 0;
  }

  if (!doc.payment.originalAmount) {
    doc.payment.originalAmount = doc.originalGrossAmount || doc.grossAmount || 0;
  }

  if (!doc.payment.discountAmount) {
    doc.payment.discountAmount = doc.discountAmount || 0;
  }

  if (!doc.payment.stripeAmount) {
    doc.payment.stripeAmount = doc.stripeAmount || 0;
  }

  if (!doc.payment.immediateAmount) {
    doc.payment.immediateAmount = doc.stripeAmount || 0;
  }

  if (!doc.payment.eventDayAmount) {
    doc.payment.eventDayAmount = doc.eventDayAmount || 0;
  }

  if (!doc.payment.checkoutSessionId && doc.stripeCheckoutSessionId) {
    doc.payment.checkoutSessionId = doc.stripeCheckoutSessionId;
  }

  if (!doc.payment.checkoutUrl && doc.stripeCheckoutUrl) {
    doc.payment.checkoutUrl = doc.stripeCheckoutUrl;
  }

  if (!doc.payment.paymentIntentId && doc.stripePaymentIntentId) {
    doc.payment.paymentIntentId = doc.stripePaymentIntentId;
  }

  if (!doc.payment.paidAt && doc.stripePaidAt) {
    doc.payment.paidAt = doc.stripePaidAt;
  }

  if (!doc.stripePaidAt && doc.payment.paidAt) {
    doc.stripePaidAt = doc.payment.paidAt;
  }

  if (!doc.paidAt && (doc.stripePaidAt || doc.payment.paidAt)) {
    doc.paidAt = doc.stripePaidAt || doc.payment.paidAt;
  }

  if (doc.status === "paid") {
    doc.payment.status = "paid";
  }

  if (!doc.salesUpsells) {
    doc.salesUpsells = {};
  }
});

EmployeeSaleSchema.index({ employeeId: 1, createdAt: -1 });
EmployeeSaleSchema.index({ employeeId: 1, status: 1, createdAt: -1 });
EmployeeSaleSchema.index({ clientEmail: 1 });
EmployeeSaleSchema.index({ clientPhone: 1 });
EmployeeSaleSchema.index({ clientUserId: 1 });
EmployeeSaleSchema.index({ stripeCheckoutSessionId: 1 });
EmployeeSaleSchema.index({ stripePaymentIntentId: 1 });
EmployeeSaleSchema.index({ status: 1, createdAt: -1 });
EmployeeSaleSchema.index({ status: 1, paidAt: -1 });
EmployeeSaleSchema.index({ paymentMode: 1, paymentProvider: 1 });
EmployeeSaleSchema.index({ source: 1, status: 1, createdAt: -1 });
EmployeeSaleSchema.index({ signedAgreementToken: 1 });
EmployeeSaleSchema.index({ agreementToken: 1 });
EmployeeSaleSchema.index({ agreementStatus: 1 });

export default models.EmployeeSale ||
  model("EmployeeSale", EmployeeSaleSchema);
