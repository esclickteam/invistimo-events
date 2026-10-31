/**
 * Interactive digital invitation templates (preview collection).
 * Schema is designed for a future INVISTIMO editor + publish pipeline
 * without coupling to the live /invite or /w guest flows yet.
 */

export type InteractiveInviteTemplateId =
  | "lunar-silk"
  | "olive-clay"
  | "noir-champagne"
  | "garden-mist"
  | "coastal-pearl"
  | "amber-archive";

export type EnvelopeVariant =
  | "classic-flap"
  | "clay-stamp"
  | "deco-diamond"
  | "botanical-wrap"
  | "shell-clasp"
  | "wax-twine";

export type ScrollMotionStyle =
  | "star-parallax"
  | "warm-drift"
  | "sharp-reveal"
  | "petal-float"
  | "wave-layers"
  | "scrapbook-stack";

export type InteractiveInviteTheme = {
  bg: string;
  bgDeep: string;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  seal: string;
  ribbon: string;
  envelope: string;
  envelopeFlap: string;
  grainOpacity: number;
  fontDisplay: string;
  fontBody: string;
  fontScript: string;
  radius: string;
  shadow: string;
};

export type InteractiveInviteEventDetails = {
  coupleNames: string;
  partnerA: string;
  partnerB: string;
  monogram: string;
  headline: string;
  subheadline: string;
  weddingDateIso: string;
  weddingDateLabel: string;
  weddingTime: string;
  receptionTime: string;
  ceremonyTime: string;
  partyNote: string;
  venueName: string;
  venueAddress: string;
  city: string;
  wazeUrl: string;
  mapsUrl: string;
  storyIntro: string;
  storyBeats: Array<{ title: string; date?: string; body: string }>;
  galleryImages: string[];
  heroImage: string;
  dressCode?: string;
  faq: Array<{ q: string; a: string }>;
  contactWhatsapp?: string;
  closingLine: string;
};

export type InteractiveInviteMusicTrack = {
  id: string;
  title: string;
  artist: string;
  src: string;
  mood: string;
};

export type InteractiveInviteTemplateMeta = {
  id: InteractiveInviteTemplateId;
  name: string;
  nameHe: string;
  tagline: string;
  description: string;
  previewImage: string;
  envelope: EnvelopeVariant;
  motion: ScrollMotionStyle;
  theme: InteractiveInviteTheme;
  defaultMusicId: string;
};

export type InteractiveInviteSiteConfig = {
  template: InteractiveInviteTemplateMeta;
  event: InteractiveInviteEventDetails;
  musicTracks: InteractiveInviteMusicTrack[];
  /** Preview-only: never writes to production RSVP/guest DB */
  previewOnly: true;
};
