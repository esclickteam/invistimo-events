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
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SystemSettings ||
  mongoose.model("SystemSettings", SystemSettingsSchema);
