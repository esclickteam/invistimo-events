import mongoose, { Types } from "mongoose";
import Event from "@/models/Event";

/* =========================================================
   Types
========================================================= */
type EventSupplierDoc = {
  eventId: Types.ObjectId;
  price?: number;
};

/* =========================================================
   Helper – Sync Event Budget from Suppliers
========================================================= */
async function syncEventBudget(eventId: Types.ObjectId) {
  if (!eventId) return;

  const suppliers = (await mongoose
    .model<EventSupplierDoc>("EventSupplier")
    .find({ eventId })
    .select("price")
    .lean()) as EventSupplierDoc[];

  const total = suppliers.reduce(
    (sum, s) => sum + Number(s.price || 0),
    0
  );

  await Event.findByIdAndUpdate(eventId, {
    $set: { budgetTotal: total },
  });
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
    files: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        type: String,
      },
    ],
  },
  { timestamps: true }
);

/* =========================================================
   🔄 Auto Sync Event Budget
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
export default mongoose.models.EventSupplier ||
  mongoose.model("EventSupplier", EventSupplierSchema);
