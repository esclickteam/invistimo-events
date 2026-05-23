import mongoose, { Schema, Types } from "mongoose";

export type VenueEventStatus =
  | "lead"
  | "proposal"
  | "closed"
  | "confirmed"
  | "preparing"
  | "live"
  | "done"
  | "cancelled";

export type VenueClientPackageType =
  | "seating_only"
  | "rsvp_seating"
  | "full_event_management";

export type VenueClientRegistrationStatus =
  | "not_sent"
  | "sent"
  | "registered";

export type VenueEventDocument = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId | string;

  hallId: string;
  hallName?: string;

  title: string;
  eventType: string;

  clientName: string;
  clientPhone?: string;
  clientEmail?: string;

  date: string;
  startTime: string;
  endTime?: string;

  guests: number;
  status: VenueEventStatus;

  budget: number;
  paidAmount: number;

  notes?: string;
  color?: string;

  /**
   * חיבור לקוח Invistimo מהאולם
   */
  clientInviteToken?: string;
  clientInviteSentAt?: Date | null;

  clientUserId?: Types.ObjectId | string | null;

  selectedSeatingTemplateId?: Types.ObjectId | string | null;

  clientPackageType?: VenueClientPackageType;

  clientRegistrationStatus?: VenueClientRegistrationStatus;

  createdAt: Date;
  updatedAt: Date;
};

const VenueEventSchema = new Schema<VenueEventDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    hallId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    hallName: {
      type: String,
      default: "",
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      default: "אירוע",
    },

    eventType: {
      type: String,
      default: "",
      trim: true,
    },

    clientName: {
      type: String,
      default: "",
      trim: true,
    },

    clientPhone: {
      type: String,
      default: "",
      trim: true,
    },

    clientEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    date: {
      type: String,
      required: true,
      index: true,
    },

    startTime: {
      type: String,
      required: true,
      trim: true,
    },

    endTime: {
      type: String,
      default: "",
      trim: true,
    },

    guests: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "lead",
        "proposal",
        "closed",
        "confirmed",
        "preparing",
        "live",
        "done",
        "cancelled",
      ],
      default: "confirmed",
      index: true,
    },

    budget: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    color: {
      type: String,
      default: "",
      trim: true,
    },

    /**
     * ==========================================
     * פתיחת לקוח Invistimo מתוך אולם
     * ==========================================
     */

    clientInviteToken: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    clientInviteSentAt: {
      type: Date,
      default: null,
    },

    clientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    selectedSeatingTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "VenueSeatingTemplate",
      default: null,
      index: true,
    },

    clientPackageType: {
      type: String,
      enum: ["seating_only", "rsvp_seating", "full_event_management"],
      default: "seating_only",
      index: true,
    },

    clientRegistrationStatus: {
      type: String,
      enum: ["not_sent", "sent", "registered"],
      default: "not_sent",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

VenueEventSchema.index({ ownerId: 1, date: 1 });
VenueEventSchema.index({ ownerId: 1, hallId: 1, date: 1 });
VenueEventSchema.index({ ownerId: 1, hallId: 1, status: 1 });
VenueEventSchema.index({ ownerId: 1, hallId: 1, clientRegistrationStatus: 1 });
VenueEventSchema.index({ clientInviteToken: 1 });

export default mongoose.models.VenueEvent ||
  mongoose.model<VenueEventDocument>("VenueEvent", VenueEventSchema);