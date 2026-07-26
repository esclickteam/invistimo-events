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
  | "footer";

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

export type WeddingDemoContent = {
  coupleNames: string;
  coupleShort: string;
  weddingDate: string;
  weddingTime: string;
  venueName: string;
  venueAddress: string;
  heroSubtitle: string;
  invitationText: string;
  storyParagraphs: string[];
  howWeMet: string;
  proposalStory: string;
  schedule: { time: string; title: string; description: string }[];
  dressCode: string;
  accommodations: { name: string; note: string; link?: string }[];
  transportation: { title: string; description: string }[];
  faq: { question: string; answer: string }[];
  giftsNote: string;
  guestbookMessages: { name: string; message: string; date: string }[];
  playlistNote: string;
  footerNote: string;
};

export type GuestUploadItem = {
  id: string;
  type: "image" | "video";
  url: string;
  name: string;
  uploadedBy: string;
  createdAt: string;
};
