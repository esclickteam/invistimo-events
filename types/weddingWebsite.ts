export type WeddingSectionId =
  | "hero"
  | "countdown"
  | "invitation"
  | "our-story"
  | "how-we-met"
  | "proposal"
  | "gallery"
  | "video"
  | "event-details"
  | "schedule"
  | "location"
  | "dress-code"
  | "accommodations"
  | "transportation"
  | "faq"
  | "rsvp"
  | "gifts"
  | "guestbook"
  | "guest-upload"
  | "playlist"
  | "footer"
  | "contact";

export type WeddingTemplateId =
  | "eternal-gold"
  | "midnight-velvet"
  | "garden-bloom"
  | "coastal-breeze"
  | "desert-rose"
  | "minimal-noir"
  | "royal-ivory"
  | "sunset-blush"
  | "forest-enchanted"
  | "modern-glass";

export type WeddingTheme = {
  bg: string;
  bgAlt: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  border: string;
  heroOverlay: string;
  fontDisplay: string;
  fontBody: string;
  radius: string;
  shadow: string;
  grain?: boolean;
};

export type WeddingTemplate = {
  id: WeddingTemplateId;
  name: string;
  tagline: string;
  description: string;
  previewImage: string;
  heroImage: string;
  galleryImages: string[];
  theme: WeddingTheme;
  mood: string;
};

/** Per-site theme overrides — layered onto template defaults, never replace the template language */
export type WeddingThemeOverrides = {
  background?: string;
  secondary?: string;
  accent?: string;
  text?: string;
  button?: string;
  card?: string;
  fontFamily?: string;
  headingScale?: number;
  stylePreset?: "classic" | "romantic" | "modern" | "bold" | "";
};

/** Editable + resolved content for a live or demo wedding site */
export type WeddingSiteContent = {
  coupleNames: string;
  coupleShort: string;
  weddingDate: string;
  weddingTime: string;
  venueName: string;
  venueAddress: string;
  venueLat: number | null;
  venueLng: number | null;
  heroSubtitle: string;
  invitationText: string;
  /** Optional welcome / intro override */
  welcomeText: string;
  /** Romantic quote / message break */
  romanticQuote: string;
  /** Social hashtag e.g. #AmitAndBen */
  hashtag: string;
  /** Story / about body */
  storyParagraphs: string[];
  howWeMet: string;
  proposalStory: string;
  schedule: { time: string; title: string; description: string }[];
  dressCode: string;
  accommodations: { name: string; note: string; link?: string }[];
  transportation: { title: string; description: string }[];
  faq: { question: string; answer: string }[];
  giftsNote: string;
  giftLinks: {
    creditUrl: string;
    payboxUrl: string;
    bitPhone: string;
    bitUrl: string;
  };
  contactPhone: string;
  contactNote: string;
  galleryUrls: string[];
  heroImageUrl: string;
  videoUrl: string;
  rsvpText: string;
  parkingText: string;
  guestbookMessages: { name: string; message: string; date: string }[];
  playlistNote: string;
  footerNote: string;
  wazeUrl: string;
  mapsUrl: string;
};

/** @deprecated alias — prefer WeddingSiteContent */
export type WeddingDemoContent = WeddingSiteContent;

export type GuestUploadItem = {
  id: string;
  type: "image" | "video";
  url: string;
  name: string;
  uploadedBy: string;
  createdAt: string;
};

export type WeddingWebsiteStatus = "draft" | "published";

export type WeddingSectionToggles = Partial<Record<WeddingSectionId, boolean>>;

export type WeddingWebsiteGuestContext = {
  token: string;
  name: string;
  rsvp: "yes" | "no" | "pending" | "";
  guestsCount: number;
  arrivedCount: number;
  notes: string;
  canSubmitRsvp: boolean;
};

export type WeddingWebsitePublicPayload = {
  shareId: string;
  templateId: WeddingTemplateId;
  status: WeddingWebsiteStatus;
  content: WeddingSiteContent;
  sections: WeddingSectionToggles;
  themeOverrides: WeddingThemeOverrides;
  guest: WeddingWebsiteGuestContext | null;
  invitationId: string;
  eventId: string;
  menuOptions: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    childrenMeal: boolean;
    kosher: boolean;
    kosherGlatt: boolean;
    kosherMahfoud: boolean;
    transportation: boolean;
  };
};
