import mongoose, { Schema, models, model } from "mongoose";

/* =========================
   Event Supplier Interface
========================= */

export interface IEventSupplier {
  eventId: mongoose.Types.ObjectId;      // האירוע
  categoryId: mongoose.Types.ObjectId;   // תחום
  categoryName: string;                  // snapshot לשם התחום
  sub: string;                           // תת־תחום

  supplierId?: mongoose.Types.ObjectId;  // ספק שנבחר
  supplierName?: string;                // snapshot (למקרה שהספק נמחק)
  supplierPhone?: string;

  price?: number;                       // מחיר כולל
  advance?: number;                     // מקדמה
  balance?: number;                     // יתרה (מחושב)

  status?: "open" | "closed" | "paid";  // סטטוס תשלום

  files?: string[];                     // קבצים / חוזים / חשבוניות
  notes?: string;                       // הערות פנימיות

  createdBy: mongoose.Types.ObjectId;    // מי הוסיף (משתמש / מפיק)

  createdAt?: Date;
  updatedAt?: Date;
}

/* =========================
   Schema
========================= */

const EventSupplierSchema = new Schema<IEventSupplier>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "SupplierCategory",
      required: true,
    },

    categoryName: {
      type: String,
      required: true,
      trim: true,
    },

    sub: {
      type: String,
      required: true,
      trim: true,
    },

    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    supplierName: {
      type: String,
      trim: true,
    },

    supplierPhone: {
      type: String,
      trim: true,
    },

    price: {
      type: Number,
      default: null,
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

    status: {
      type: String,
      enum: ["open", "closed", "paid"],
      default: "open",
    },

    files: {
      type: [String],
      default: [],
    },

    notes: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   Middleware
========================= */

// חישוב יתרה אוטומטי
EventSupplierSchema.pre("save", function () {
  if (this.price != null) {
    this.balance = Math.max(
      0,
      (this.price || 0) - (this.advance || 0)
    );
  }
});

/* =========================
   Indexes
========================= */

// ספקים לפי אירוע
EventSupplierSchema.index({ eventId: 1 });

// ספקים לפי קטגוריה ותת־תחום
EventSupplierSchema.index({ categoryId: 1, sub: 1 });

// ספקים לפי סטטוס תשלום
EventSupplierSchema.index({ status: 1 });

/* =========================
   Export
========================= */

const EventSupplier =
  models.EventSupplier ||
  model<IEventSupplier>("EventSupplier", EventSupplierSchema);

export default EventSupplier;
