import mongoose, { Types } from "mongoose";

/* =========================================================
   Types
========================================================= */
type EventSupplierDoc = {
  eventId: Types.ObjectId;
  price?: number;
};

/* =========================================================
   Helper – Sync Event Budget from Suppliers
   ⚠️ חישוב בלבד – לא מעדכן Event
========================================================= */
async function syncEventBudget(eventId: Types.ObjectId) {
  if (!eventId) return;

  const suppliers = (await mongoose
    .model<EventSupplierDoc>("EventSupplier")
    .find({ eventId })
    .select("price")
    .lean()) as EventSupplierDoc[];

  const totalCommitments = suppliers.reduce(
    (sum, s) => sum + Number(s.price || 0),
    0
  );

  // ❌ לא נוגעים ב־Event.budgetTotal
  // budgetTotal נשלט ידנית בלבד דרך /api/events/[eventId]/overview

  if (process.env.NODE_ENV !== "production") {
    console.log("🟡 EventSupplier sync (calculated commitments only):", {
      eventId: String(eventId),
      totalCommitments,
    });
  }

  return totalCommitments;
}

/* =========================================================
   Schema
========================================================= */
const EventSupplierSchema = new mongoose.Schema(
  {
    /* =========================
       🔗 אירוע
    ========================= */
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Event",
    },

    /* =========================
       🗂 קטגוריה
    ========================= */
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupplierCategory",
      required: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    sub: {
      type: String,
      required: true,
      trim: true,
    },

    /* =========================
       🧑 ספק
    ========================= */
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
      index: true,
    },

    supplierName: {
      type: String,
      trim: true,
    },

    supplierOptions: [
  {
    name: String,

    phone: String,

    totalPrice: {
      type: Number,
      default: 0,
    },

    advancePrice: {
      type: Number,
      default: 0,
    },

    includes: {
      type: [String],
      default: [],
    },
  },
],

    /* =========================
       💰 תמחור
    ========================= */
    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    advance: {
      type: Number,
      default: 0,
      min: 0,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* =========================
       📎 קבצים
    ========================= */
    files: {
  type: [mongoose.Schema.Types.Mixed],
  default: [],
},
  },
  { timestamps: true }
);

/* =========================================================
   🔄 Hooks – חישוב בלבד (לא דריסה!)
========================================================= */
EventSupplierSchema.post("save", async function () {
  await syncEventBudget(this.eventId as Types.ObjectId);
});

EventSupplierSchema.post(
  "findOneAndUpdate",
  async function (doc: EventSupplierDoc | null) {
    if (doc?.eventId) {
      await syncEventBudget(doc.eventId);
    }
  }
);

EventSupplierSchema.post(
  "findOneAndDelete",
  async function (doc: EventSupplierDoc | null) {
    if (doc?.eventId) {
      await syncEventBudget(doc.eventId);
    }
  }
);

/* =========================================================
   Export (HMR-safe)
========================================================= */
const EventSupplier =
  mongoose.models.EventSupplier ||
  mongoose.model(
    "EventSupplier",
    EventSupplierSchema
  );

export default EventSupplier;