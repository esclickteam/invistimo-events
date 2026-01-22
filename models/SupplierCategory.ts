import mongoose, { Schema, models, model } from "mongoose";

/* =========================
   Supplier Category Schema
========================= */

export interface ISupplierCategory {
  name: string;        // צילום / מוזיקה / אוכל וכו'
  subs: string[];      // תתי־תחומים
  createdBy?: mongoose.Types.ObjectId; // מי יצר (אופציונלי – למערכת / משתמש)
  isSystem?: boolean;  // קטגוריית מערכת (לא ניתנת למחיקה)
  createdAt?: Date;
  updatedAt?: Date;
}

const SupplierCategorySchema = new Schema<ISupplierCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // אין כפילויות תחומים
    },

    subs: {
      type: [String],
      default: [],
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isSystem: {
      type: Boolean,
      default: false, // true = קטגוריות ברירת מחדל של Invistimo
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   Indexes
========================= */

// חיפוש מהיר לפי שם
SupplierCategorySchema.index({ name: 1 });

/* =========================
   Export Model
========================= */

const SupplierCategory =
  models.SupplierCategory ||
  model<ISupplierCategory>("SupplierCategory", SupplierCategorySchema);

export default SupplierCategory;
