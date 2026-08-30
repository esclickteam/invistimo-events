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

export type WeddingMediaType = "image" | "video";

export type WeddingMediaFit = "cover" | "contain";

export type WeddingMediaSlot = {
  type: WeddingMediaType;
  src: string;
  alt?: string;
  poster?: string;
  fit?: WeddingMediaFit;
  position?: string;
  /** Focal point used on narrow screens; falls back to `position`. */
  positionMobile?: string;
  zoom?: number;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
};

export type WeddingTextStyle = {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  color?: string;
  textAlign?: "right" | "center" | "left";
  lineHeight?: string | number;
  letterSpacing?: string;
};

export type WeddingSectionAlign = "right" | "center" | "left";

export type WeddingSectionStyle = {
  backgroundColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
  backgroundMedia?: WeddingMediaSlot | null;
  align?: WeddingSectionAlign;
  /** Max content width, e.g. `64rem`. */
  width?: string;
  columns?: number;
  gap?: string;
  radius?: string;
  imageFit?: WeddingMediaFit;
  /** Hero only: 0-100 darkening of the background media. */
  overlayOpacity?: number;
  /** Hero only: viewport height percentage. */
  heroHeight?: number;
  heroHeightMobile?: number;
};

export type WeddingDemoContent = {
  coupleNames: string;
  coupleShort: string;
  weddingDate: string;
  weddingTime: string;
  venueName: string;
  venueAddress: string;
  venueLat?: number | null;
  venueLng?: number | null;
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
  guestMessageTitle?: string;
  guestMessageDescription?: string;
  rsvpTitle?: string;
  rsvpSubtitle?: string;
  transportationTitle?: string;
  transportationDescription?: string;
  heroImage?: string;
  galleryImages?: string[];
  media?: Record<string, WeddingMediaSlot>;
  styles?: Record<string, WeddingTextStyle>;
  /** Narrow-screen overrides layered on top of `styles` for the same paths. */
  mobileStyles?: Record<string, WeddingTextStyle>;
  sectionStyles?: Record<string, WeddingSectionStyle>;
  sectionOrder?: Array<WeddingSectionId | "guest-message">;
  copy?: Record<string, string>;
  sections?: Partial<Record<WeddingSectionId | "guest-message", boolean>>;
  /** Global look-and-feel overrides on top of the template's own theme. */
  theme?: WeddingThemeOverrides;
};

export type WeddingThemeOverrides = {
  colors?: Partial<
    Record<"accent" | "accentSoft" | "bg" | "bgAlt" | "surface" | "text" | "textMuted", string>
  >;
  headingFont?: string;
  bodyFont?: string;
  radius?: "template" | "sharp" | "soft" | "round";
  spacing?: "template" | "compact" | "airy";
};

export type WeddingEventData = {
  coupleNames: string;
  weddingDate: string;
  weddingTime: string;
  venueName: string;
  venueAddress: string;
  venueLat?: number | null;
  venueLng?: number | null;
};

export type GuestUploadItem = {
  id: string;
  type: "image" | "video";
  url: string;
  name: string;
  uploadedBy: string;
  createdAt: string;
  expiresAt?: string;
  source?: "guest" | "couple";
};
