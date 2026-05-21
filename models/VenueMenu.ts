import mongoose, { Schema, models, model } from "mongoose";

/* ======================================================
   TYPES
====================================================== */

export type VenueMenuStatus = "active" | "draft";

export type VenueMenuDish = {
  id: string;
  name: string;
  description: string;
  image: string;
  tags: string[];
};

export type VenueMenuCategory = {
  id: string;
  title: string;
  subtitle: string;
  minChoices: number;
  maxChoices: number;
  dishes: VenueMenuDish[];
};

export interface IVenueMenu {
  ownerId: mongoose.Types.ObjectId;
  hallId: string;

  name: string;
  description: string;
  type: string;
  status: VenueMenuStatus;

  categories: VenueMenuCategory[];

  createdAt: Date;
  updatedAt: Date;
}

/* ======================================================
   DISH SCHEMA
====================================================== */

const VenueMenuDishSchema = new Schema<VenueMenuDish>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    tags: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  }
);

/* ======================================================
   CATEGORY SCHEMA
====================================================== */

const VenueMenuCategorySchema = new Schema<VenueMenuCategory>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    subtitle: {
      type: String,
      default: "",
      trim: true,
    },

    minChoices: {
      type: Number,
      default: 1,
      min: 0,
    },

    maxChoices: {
      type: Number,
      default: 1,
      min: 0,
    },

    dishes: {
      type: [VenueMenuDishSchema],
      default: [],
    },
  },
  {
    _id: false,
  }
);

/* ======================================================
   MENU SCHEMA
====================================================== */

const VenueMenuSchema = new Schema<IVenueMenu>(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    hallId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "draft"],
      default: "draft",
      index: true,
    },

    categories: {
      type: [VenueMenuCategorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/* ======================================================
   HOOKS
====================================================== */

VenueMenuSchema.pre("validate", function () {
  const doc = this as any;

  if (doc.name) {
    doc.name = String(doc.name).trim();
  }

  if (doc.description) {
    doc.description = String(doc.description).trim();
  }

  if (doc.type) {
    doc.type = String(doc.type).trim();
  }

  if (!Array.isArray(doc.categories)) {
    doc.categories = [];
  }

  doc.categories = doc.categories.map((category: any) => {
    const categoryId =
      category.id ||
      `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const dishes = Array.isArray(category.dishes) ? category.dishes : [];

    const minChoices = Math.max(0, Number(category.minChoices || 0));
    const maxChoices = Math.max(
      minChoices,
      Number(category.maxChoices || minChoices || 1)
    );

    return {
      id: String(categoryId),
      title: String(category.title || "קטגוריה ללא שם").trim(),
      subtitle: String(category.subtitle || "").trim(),
      minChoices,
      maxChoices,
      dishes: dishes.map((dish: any) => ({
        id:
          dish.id ||
          `dish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: String(dish.name || "מנה ללא שם").trim(),
        description: String(dish.description || "").trim(),
        image: String(dish.image || "").trim(),
        tags: Array.isArray(dish.tags)
          ? dish.tags.map((tag: any) => String(tag).trim()).filter(Boolean)
          : [],
      })),
    };
  });
});

/* ======================================================
   INDEXES
====================================================== */

VenueMenuSchema.index({ ownerId: 1, hallId: 1, createdAt: -1 });
VenueMenuSchema.index({ ownerId: 1, hallId: 1, status: 1 });
VenueMenuSchema.index({ ownerId: 1, hallId: 1, name: 1 });

/* ======================================================
   MODEL
====================================================== */

const VenueMenu =
  models.VenueMenu || model<IVenueMenu>("VenueMenu", VenueMenuSchema);

export default VenueMenu;