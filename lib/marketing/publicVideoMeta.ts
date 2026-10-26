/**
 * Intrinsic dimensions for public Invistimo marketing videos.
 * Used to set aspect-ratio so frames are never cropped (object-fit: contain).
 * Measured with ffprobe from files under public/.
 */
export type PublicVideoMeta = {
  width: number;
  height: number;
  /** CSS aspect-ratio value, e.g. "390 / 844" */
  aspectRatio: string;
  orientation: "portrait" | "landscape" | "square";
  /** Prefer expand lightbox when UI text may be hard to read */
  expandable?: boolean;
};

function meta(width: number, height: number, expandable = false): PublicVideoMeta {
  const orientation =
    width === height ? "square" : width > height ? "landscape" : "portrait";
  return {
    width,
    height,
    aspectRatio: `${width} / ${height}`,
    orientation,
    expandable: expandable || orientation === "landscape",
  };
}

/** Path → intrinsic size. Keys match `src` used in marketing pages. */
export const PUBLIC_VIDEO_META: Record<string, PublicVideoMeta> = {
  "/marketing/videos/hero-guest-journey.webm": meta(390, 844),
  "/marketing/videos/home-save-the-date.webm": meta(1280, 720),
  "/marketing/videos/wedding-website-scroll.webm": meta(1280, 720, true),
  "/videos/rsvp-hero-wa.mp4": meta(840, 1520),
  "/videos/rsvp-hero-live.mp4": meta(840, 1520),
  "/videos/rsvp-steps-wa.mp4": meta(840, 1520),
  "/videos/rsvp-steps-live.mp4": meta(840, 1520),
  "/videos/chatuna-guests.mp4": meta(1280, 720, true),
  "/videos/chatuna-timing-v.mp4": meta(720, 1280),
  "/videos/smartsit.mp4": meta(1280, 720, true),
  "/videos/tablesit.mp4": meta(1882, 898, true),
  "/videos/eventsit.mp4": meta(1280, 720, true),
  "/videos/sit4.mp4": meta(500, 500),
  "/videos/home1.mp4": meta(464, 848),
  "/videos/rsvp1.mp4": meta(400, 816),
  "/videos/rsvp2.mp4": meta(1920, 1080, true),
  "/videos/event-management/system-overview.webm": meta(1280, 800, true),
  "/videos/event-management/tasks-flow.webm": meta(1280, 800, true),
  "/videos/event-management/budget-flow.webm": meta(1280, 800, true),
  "/videos/event-management/event-day.webm": meta(1280, 800, true),
};

export function getPublicVideoMeta(src: string): PublicVideoMeta | null {
  if (!src) return null;
  if (PUBLIC_VIDEO_META[src]) return PUBLIC_VIDEO_META[src];
  // Strip query/hash if present
  const clean = src.split("?")[0]?.split("#")[0] || src;
  return PUBLIC_VIDEO_META[clean] ?? null;
}

/** Sensible frame shell classes so portrait clips don't dominate desktop height. */
export function publicVideoShellClass(meta: PublicVideoMeta | null): string {
  if (!meta) return "w-full";
  if (meta.orientation === "portrait") {
    return "mx-auto w-full max-w-[min(100%,380px)]";
  }
  if (meta.orientation === "square") {
    return "mx-auto w-full max-w-[min(100%,480px)]";
  }
  return "mx-auto w-full max-w-4xl";
}
