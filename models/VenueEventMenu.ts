import mongoose, { Schema, model, models } from "mongoose";

const VenueEventMenuDishSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    originalDishId: {
      type: String,
      default: "",
      index: true,
    },

    name: {
      type: String,
      default: "",
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

const VenueEventMenuCategorySchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    originalCategoryId: {
      type: String,
      default: "",
      index: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    subtitle: {
      type: String,
      default: "",
      trim: true,
    },

    /*
      כמות הבחירה המקורית מתוך תפריט הבסיס של האולם.
      לדוגמה: בתפריט הקבוע מוגדר 1 מתוך 3.
    */
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

    /*
      כמות הבחירה לאירוע הספציפי בלבד.
      כאן האולם יכול לשנות לדוגמה מ־1 מתוך 3 ל־2 מתוך 3
      בלי לפגוע בתפריט הקבוע של האולם.
    */
    eventMinChoices: {
      type: Number,
      default: 1,
      min: 0,
    },

    eventMaxChoices: {
      type: Number,
      default: 1,
      min: 0,
    },

    eventNote: {
      type: String,
      default: "",
      trim: true,
    },

    dishes: {
      type: [VenueEventMenuDishSchema],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const VenueEventMenuSelectedDishSchema = new Schema(
  {
    categoryId: {
      type: String,
      required: true,
      index: true,
    },

    dishId: {
      type: String,
      required: true,
      index: true,
    },

    dishName: {
      type: String,
      default: "",
      trim: true,
    },

    categoryTitle: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const VenueEventMenuSchema = new Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    hallId: {
      type: String,
      default: "",
      index: true,
    },

    venueOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VenueMenu",
      required: true,
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
      enum: ["pending", "submitted", "updated", "approved"],
      default: "pending",
      index: true,
    },

    /*
      token אישי לבחירת מנות.
      הקישור לבעל האירוע יהיה לפי token ולא לפי eventId.
    */
    selectionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /*
      מצב עריכה לבעל האירוע:
      untilDate = אפשר לערוך עד תאריך שהאולם הגדיר.
      lockAfterSubmit = אחרי שמירה ראשונה התפריט ננעל לצפייה בלבד.
    */
    selectionEditMode: {
      type: String,
      enum: ["untilDate", "lockAfterSubmit"],
      default: "untilDate",
      index: true,
    },

    /*
      עד מתי בעל האירוע יכול לערוך.
      אם התאריך עבר — הדף נפתח לצפייה בלבד.
    */
    selectionEditableUntil: {
      type: Date,
      default: null,
      index: true,
    },

    /*
      מתי התפריט ננעל בפועל.
      למשל אחרי שמירה ראשונה במצב lockAfterSubmit,
      או בעתיד אם האולם ינעל ידנית.
    */
    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },

    lockedReason: {
      type: String,
      default: "",
      trim: true,
    },

    /*
      הערה כללית של האולם לאירוע הספציפי.
      לדוגמה: "באירוע הזה לאפשר בחירה מורחבת בעיקריות".
    */
    eventNote: {
      type: String,
      default: "",
      trim: true,
    },

    categories: {
      type: [VenueEventMenuCategorySchema],
      default: [],
    },

    /*
      הבחירות שבעל האירוע שמר.
      זה מה שהאולם יראה אצלו אחרי שבעל האירוע בחר.
    */
    selectedDishes: {
      type: [VenueEventMenuSelectedDishSchema],
      default: [],
    },

    customerNote: {
      type: String,
      default: "",
      trim: true,
    },

    submittedByName: {
      type: String,
      default: "",
      trim: true,
    },

    submittedByPhone: {
      type: String,
      default: "",
      trim: true,
    },

    submittedAt: {
      type: Date,
      default: null,
      index: true,
    },

    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

VenueEventMenuSchema.index(
  {
    eventId: 1,
    venueOwnerId: 1,
  },
  {
    unique: true,
  }
);

VenueEventMenuSchema.index({
  hallId: 1,
  createdAt: -1,
});

VenueEventMenuSchema.index({
  templateId: 1,
  createdAt: -1,
});

VenueEventMenuSchema.index({
  selectionEditMode: 1,
  selectionEditableUntil: 1,
});

export default models.VenueEventMenu ||
  model("VenueEventMenu", VenueEventMenuSchema);