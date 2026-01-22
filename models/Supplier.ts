import mongoose, { Schema, models, model } from "mongoose";

/* =========================
   Supplier Interface
========================= */

export interface ISupplier {
  name: string;                         // שם הספק
  phone?: string;                       // טלפון
  email?: string;                       // מייל (אופציונלי)
  link?: string;                        // אתר / אינסטגרם / וואטסאפ
  notes?: string;                      // הערות פנימיות

  categoryId: mongoose.Types.ObjectId;  // תחום ראשי
  sub: string;                          // תת־תחום

  basePrice?: number;                  // מחיר ברירת מחדל (לאירועים חדשים)

  createdBy: mongoose.Types.ObjectId;   // מי הוסיף את הספק (משתמש / מפיק)
  businessId?: mongoose.Types.ObjectId; // אם הספק הוא עסק רשום במערכת

  isArchived?: boolean;                // ספק לא פעיל
  createdAt?: Date;
  updatedAt?: Date;
}

/* =========================
   Schema
========================= */

const SupplierSchema = new Schema<ISupplier>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    link: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "SupplierCategory",
      required: true,
    },

    sub: {
      type: String,
      required: true,
      trim: true,
    },

    basePrice: {
      type: Number,
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      default: null,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   Indexes
========================= */

// חיפוש ספקים לפי שם
SupplierSchema.index({ name: 1 });

// חיפוש לפי תחום + תת־תחום
SupplierSchema.index({ categoryId: 1, sub: 1 });

// מניעת כפילות ספק לאותו משתמש
SupplierSchema.index(
  { name: 1, phone: 1, createdBy: 1 },
  { unique: true, sparse: true }
);

/* =========================
   Export
========================= */

const Supplier =
  models.Supplier || model<ISupplier>("Supplier", SupplierSchema);

export default Supplier;
