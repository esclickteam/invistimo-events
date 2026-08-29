/**
 * Local wedding media — served from /public/wedding-media.
 * Guarantees render-safe assets (no hotlink / referrer breakage).
 */

export const WW_IMAGES = {
  ceremony: "/wedding-media/ceremony.jpg",
  outdoorCouple: "/wedding-media/outdoorCouple.jpg",
  venueArch: "/wedding-media/venueArch.jpg",
  coupleClose: "/wedding-media/coupleClose.jpg",
  florals: "/wedding-media/florals.jpg",
  elegantHall: "/wedding-media/elegantHall.jpg",
  tableSetting: "/wedding-media/tableSetting.jpg",
  nightGlow: "/wedding-media/nightGlow.jpg",
  ringsHands: "/wedding-media/ringsHands.jpg",
  aisleWalk: "/wedding-media/aisleWalk.jpg",
  kiss: "/wedding-media/kiss.jpg",
  softPortrait: "/wedding-media/softPortrait.jpg",
  bouquet: "/wedding-media/bouquet.jpg",
  celebration: "/wedding-media/celebration.jpg",
  beachCouple: "/wedding-media/beachCouple.jpg",
} as const;

export type WwImageKey = keyof typeof WW_IMAGES;

/** Local wedding-only MP4s under /public/wedding-media/videos */
export const WW_VIDEOS = {
  coupleWalk: "/wedding-media/videos/couple.mp4",
  romantic: "/wedding-media/videos/romantic.mp4",
  /** Wedding dance / reception — not landscape stock */
  natureSoft: "/wedding-media/videos/wedding-dance.mp4",
  celebration: "/wedding-media/videos/celebration.mp4",
  weddingDance: "/wedding-media/videos/wedding-dance.mp4",
} as const;

export function gallerySet(...keys: WwImageKey[]) {
  return keys.map((k) => WW_IMAGES[k]).filter(Boolean);
}

/** Always return non-empty unique gallery URLs with local fallbacks */
export function sanitizeGallery(
  urls: unknown,
  fallback: string[] = Object.values(WW_IMAGES).slice(0, 6)
): string[] {
  const cleaned = Array.isArray(urls)
    ? urls
        .map((u) => (typeof u === "string" ? u.trim() : ""))
        .filter(
          (u) =>
            Boolean(u) &&
            u !== "undefined" &&
            u !== "null" &&
            !(u.startsWith("/") && u.includes("&"))
        )
    : [];
  const unique = [...new Set(cleaned)];
  if (unique.length > 0) return unique;
  return [...fallback];
}

export const WW_FONT_OPTIONS = [
  { id: "cormorant", label: "Cormorant Garamond", css: "'Cormorant Garamond', serif" },
  { id: "playfair", label: "Playfair Display", css: "'Playfair Display', serif" },
  { id: "libre", label: "Libre Baskerville", css: "'Libre Baskerville', serif" },
  { id: "montserrat", label: "Montserrat", css: "'Montserrat', sans-serif" },
  { id: "heebo", label: "Heebo", css: "'Heebo', sans-serif" },
] as const;

export type WwFontId = (typeof WW_FONT_OPTIONS)[number]["id"];

export const WW_STYLE_PRESETS = [
  { id: "classic", label: "קלאסי" },
  { id: "romantic", label: "רומנטי" },
  { id: "modern", label: "מודרני" },
  { id: "bold", label: "בולט" },
] as const;
