import mongoose from "mongoose";

const DecisionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },

    createdTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventTask",
      default: undefined,
    },
  },
  {
    _id: false,
  }
);

const EventConversationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    /*
      נשאר לתאימות אחורה,
      אבל הורחב כדי לתמוך ביומן החדש.
    */
    type: {
      type: String,
      enum: [
        "meeting",
        "call",
        "note",
        "event",
        "reminder",
        "task",
        "zoom",
      ],
      required: true,
      default: "meeting",
      index: true,
    },

    /*
      שדות חדשים ליומן
    */
    calendarType: {
      type: String,
      enum: [
        "meeting",
        "call",
        "note",
        "event",
        "reminder",
        "task",
        "zoom",
      ],
      default: "meeting",
      index: true,
    },

    meetingType: {
      type: String,
      default: "meeting",
      trim: true,
    },

    /*
      נשאר לתאימות אחורה,
      אבל הורחב כדי שלא יפיל שמירה מהיומן.
    */
    entityType: {
      type: String,
      enum: [
        "couple",
        "supplier",
        "venue",
        "other",
        "calendar",
        "event",
        "producer",
      ],
      required: true,
      default: "calendar",
    },

    entityName: {
      type: String,
      required: true,
      trim: true,
    },

    /*
      שדות שם נוספים כדי שהפרונט יוכל לקרוא בנוחות.
    */
    title: {
      type: String,
      default: "",
      trim: true,
    },

    name: {
      type: String,
      default: "",
      trim: true,
    },

    subject: {
      type: String,
      default: "",
      trim: true,
    },

    date: {
      type: String, // yyyy-mm-dd
      required: true,
      index: true,
    },

    meetingDate: {
      type: String,
      default: "",
      index: true,
    },

    eventDate: {
      type: String,
      default: "",
      index: true,
    },

    dueDate: {
      type: String,
      default: "",
      index: true,
    },

    time: {
      type: String, // HH:mm
      default: "",
    },

    meetingTime: {
      type: String,
      default: "",
    },

    eventTime: {
      type: String,
      default: "",
    },

    hour: {
      type: String,
      default: "",
    },

    summary: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    message: {
      type: String,
      default: "",
      trim: true,
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    zoomLink: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "planned",
        "done",
        "cancelled",
        "pending",
      ],
      default: "planned",
      index: true,
    },

    syncToProducerCalendar: {
      type: Boolean,
      default: true,
      index: true,
    },

    decisions: {
      type: [DecisionSchema],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

EventConversationSchema.index({
  eventId: 1,
  date: 1,
  time: 1,
});

EventConversationSchema.index({
  eventId: 1,
  calendarType: 1,
  date: 1,
});

export default mongoose.models.EventConversation ||
  mongoose.model(
    "EventConversation",
    EventConversationSchema
  );