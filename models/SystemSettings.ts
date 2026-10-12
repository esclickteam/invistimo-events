import mongoose, { Schema } from "mongoose";

const SystemSettingsSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
      index: true,
    },

    /**
     * גוף הודעת התזכורת המרכזי — נערך מהאדמין הראשי בלבד.
     * נבנה מחדש בזמן שליחה בפועל, לא בזמן תזמון.
     */
    reminderSmsBody: {
      type: String,
      default: "",
    },

    /**
     * Set after the one-time kosher prefix seed. Later admin edits are not overwritten.
     */
    kosherPrefixesInitialized: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SystemSettings ||
  mongoose.model("SystemSettings", SystemSettingsSchema);
