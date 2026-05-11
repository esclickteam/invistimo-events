import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IEventTimelineStep
  extends Document {
  eventId:
    mongoose.Types.ObjectId;

  title: string;

  time: string;

  status:
    | "pending"
    | "missing"
    | "done";

  order: number;

  createdAt: Date;

  updatedAt: Date;
}

const EventTimelineStepSchema =
  new Schema<IEventTimelineStep>(
    {
      eventId: {
        type:
          Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        index: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
      },

      time: {
        type: String,
        default: "",
      },

      status: {
        type: String,
        enum: [
          "pending",
          "missing",
          "done",
        ],
        default: "pending",
      },

      order: {
        type: Number,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );

const EventTimelineStep: Model<IEventTimelineStep> =
  mongoose.models
    .EventTimelineStep ||
  mongoose.model<IEventTimelineStep>(
    "EventTimelineStep",
    EventTimelineStepSchema
  );

export default EventTimelineStep;