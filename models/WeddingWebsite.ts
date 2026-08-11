import mongoose, { Schema, models, model } from "mongoose";

const WEDDING_TEMPLATE_ID_ENUM = [
  "eternal-gold",
  "midnight-velvet",
  "garden-bloom",
  "coastal-breeze",
  "desert-rose",
  "minimal-noir",
  "royal-ivory",
  "sunset-blush",
  "forest-enchanted",
  "modern-glass",
] as const;

const ScheduleItemSchema = new Schema(
  {
    time: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const AccommodationSchema = new Schema(
  {
    name: { type: String, default: "" },
    note: { type: String, default: "" },
    link: { type: String, default: "" },
  },
  { _id: false }
);

const TransportItemSchema = new Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const FaqItemSchema = new Schema(
  {
    question: { type: String, default: "" },
    answer: { type: String, default: "" },
  },
  { _id: false }
);

const GuestbookMessageSchema = new Schema(
  {
    name: { type: String, default: "" },
    message: { type: String, default: "" },
    date: { type: String, default: "" },
  },
  { _id: false }
);

const ContentSchema = new Schema(
  {
    coupleNames: { type: String, default: "" },
    coupleShort: { type: String, default: "" },
    weddingDate: { type: String, default: "" },
    weddingTime: { type: String, default: "" },
    venueName: { type: String, default: "" },
    venueAddress: { type: String, default: "" },
    heroSubtitle: { type: String, default: "" },
    invitationText: { type: String, default: "" },
    storyParagraphs: { type: [String], default: [] },
    howWeMet: { type: String, default: "" },
    proposalStory: { type: String, default: "" },
    schedule: { type: [ScheduleItemSchema], default: [] },
    dressCode: { type: String, default: "" },
    accommodations: { type: [AccommodationSchema], default: [] },
    transportation: { type: [TransportItemSchema], default: [] },
    faq: { type: [FaqItemSchema], default: [] },
    giftsNote: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    contactNote: { type: String, default: "" },
    galleryUrls: { type: [String], default: [] },
    heroImageUrl: { type: String, default: "" },
    guestbookMessages: { type: [GuestbookMessageSchema], default: [] },
    playlistNote: { type: String, default: "" },
    footerNote: { type: String, default: "" },
  },
  { _id: false }
);

const WeddingWebsiteSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
      index: true,
    },

    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      unique: true,
      index: true,
    },

    /** Same as Invitation.shareId — used only for /w/[shareId] lookup. Does not alter invite URLs. */
    shareId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    templateId: {
      type: String,
      required: true,
      enum: [...WEDDING_TEMPLATE_ID_ENUM],
      default: "eternal-gold",
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },

    content: {
      type: ContentSchema,
      default: () => ({}),
    },

    /**
     * Optional section visibility. Missing keys = default visible for the template.
     */
    sections: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

WeddingWebsiteSchema.index({ ownerId: 1, updatedAt: -1 });

const WeddingWebsite =
  models.WeddingWebsite || model("WeddingWebsite", WeddingWebsiteSchema);

export default WeddingWebsite;
