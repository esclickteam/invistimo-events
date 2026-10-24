/** Invistimo marketing — Atelier Graphite (events × SaaS). Not cream/gold. */
export const mkt = {
  ink: "#0B0E13",
  inkSoft: "#1A222D",
  graphite: "#2A3340",
  body: "#3D4754",
  muted: "#6B7583",
  paper: "#F2F4F7",
  paperSoft: "#E8ECF1",
  surface: "#FFFFFF",
  line: "#D5DBE3",
  accent: "#0F766E",
  accentDeep: "#0B5A54",
  accentSoft: "#D5F0ED",
  rose: "#B86B5A",
} as const;

export const ctaPrimaryClass =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-[#0B0E13] px-8 py-3 text-base font-bold text-white transition hover:bg-[#1A222D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]";

export const ctaSecondaryClass =
  "inline-flex min-h-12 items-center justify-center rounded-md border border-[#D5DBE3] bg-white px-8 py-3 text-base font-bold text-[#1A222D] transition hover:border-[#0F766E] hover:text-[#0F766E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]";

export const ctaOnDarkClass =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-white px-8 py-3 text-base font-bold text-[#0B0E13] transition hover:bg-[#D5F0ED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export const ctaOnDarkSecondaryClass =
  "inline-flex min-h-12 items-center justify-center rounded-md border border-white/35 bg-transparent px-8 py-3 text-base font-bold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Path-based layout so service/guide pages do not clone one skeleton. */
export type MarketingLayoutVariant =
  | "dark-hero"
  | "split-media"
  | "gallery-first"
  | "timeline"
  | "editorial";

export function layoutVariantForPath(path: string): MarketingLayoutVariant {
  if (
    path === "/rsvp" ||
    path === "/rsvp/chatuna" ||
    path === "/wedding-website" ||
    path === "/event-management" ||
    path === "/pricing"
  ) {
    return "dark-hero";
  }
  if (path === "/invitations/chatuna" || path.startsWith("/for/")) {
    return "gallery-first";
  }
  if (path === "/rsvp/save-the-date" || path === "/seating-explained") {
    return "split-media";
  }
  if (path.startsWith("/info/guides/")) {
    if (
      path.includes("when-to-send") ||
      path.includes("how-many") ||
      path.includes("event-day")
    ) {
      return "timeline";
    }
    return "editorial";
  }
  if (
    path === "/rsvp/whatsapp" ||
    path === "/rsvp/sms" ||
    path === "/rsvp/calls" ||
    path === "/rsvp/reminders" ||
    path === "/rsvp/thank-you-messages" ||
    path === "/rsvp/guest-list"
  ) {
    return "split-media";
  }
  return "editorial";
}
