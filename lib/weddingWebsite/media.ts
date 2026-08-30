import type {
  WeddingDemoContent,
  WeddingMediaFit,
  WeddingMediaSlot,
  WeddingTemplate,
} from "@/types/weddingWebsite";
import {
  getOptimizedWeddingImageUrl,
  isAllowedWeddingImageUrl,
  sanitizeWeddingImageUrl,
} from "@/lib/weddingWebsite/images";

const VIDEO_EXT_RE = /\.(mp4|webm|ogg)(\?|#|$)/i;
const VIDEO_HOST_RE = /(\/video\/upload\/|\.mp4|\.webm)/i;

export const DEFAULT_WEDDING_MEDIA: Omit<WeddingMediaSlot, "src" | "type"> = {
  fit: "cover",
  position: "50% 50%",
  zoom: 1,
  autoplay: true,
  muted: true,
  loop: true,
};

export function isWeddingVideoUrl(value: unknown) {
  const url = String(value || "").trim();
  if (!url) return false;
  return VIDEO_EXT_RE.test(url) || VIDEO_HOST_RE.test(url);
}

export function sanitizeWeddingMediaUrl(value: unknown) {
  return sanitizeWeddingImageUrl(value);
}

export function normalizeWeddingMediaSlot(
  value: unknown,
  fallback?: WeddingMediaSlot | null
): WeddingMediaSlot | null {
  const raw = value && typeof value === "object" ? (value as Partial<WeddingMediaSlot>) : null;
  const src = sanitizeWeddingMediaUrl(raw?.src ?? fallback?.src);
  const type: WeddingMediaSlot["type"] =
    raw?.type === "video" || raw?.type === "image"
      ? raw.type
      : isWeddingVideoUrl(src)
        ? "video"
        : "image";

  if (!src && !fallback) return null;

  const fit: WeddingMediaFit =
    raw?.fit === "contain" || fallback?.fit === "contain" ? "contain" : "cover";
  const autoplay =
    typeof raw?.autoplay === "boolean" ? raw.autoplay : fallback?.autoplay ?? type === "video";
  const muted =
    typeof raw?.muted === "boolean" ? raw.muted : fallback?.muted ?? (autoplay ? true : false);

  return {
    type,
    src: src || fallback?.src || "",
    alt: String(raw?.alt || fallback?.alt || "").trim(),
    poster: sanitizeWeddingMediaUrl(raw?.poster ?? fallback?.poster) || undefined,
    fit,
    position: String(raw?.position || fallback?.position || "50% 50%").trim() || "50% 50%",
    positionMobile:
      String(raw?.positionMobile || fallback?.positionMobile || "").trim() || undefined,
    zoom:
      typeof raw?.zoom === "number" && Number.isFinite(raw.zoom)
        ? Math.min(Math.max(raw.zoom, 1), 2.5)
        : fallback?.zoom || 1,
    autoplay,
    muted: autoplay ? true : muted,
    loop: typeof raw?.loop === "boolean" ? raw.loop : fallback?.loop ?? type === "video",
  };
}

export function mediaSlotFromImageUrl(src: string, alt = ""): WeddingMediaSlot {
  return {
    type: isWeddingVideoUrl(src) ? "video" : "image",
    src: sanitizeWeddingMediaUrl(src),
    alt,
    ...DEFAULT_WEDDING_MEDIA,
    autoplay: isWeddingVideoUrl(src),
    muted: true,
    loop: isWeddingVideoUrl(src),
  };
}

export function inferMediaSlotId(
  src: string,
  _template?: WeddingTemplate | null,
  content?: Partial<WeddingDemoContent> | null
) {
  const url = sanitizeWeddingMediaUrl(src);
  if (!url) return "";

  const media = content?.media || {};
  for (const [key, slot] of Object.entries(media)) {
    if (slot?.src && urlsMatch(url, slot.src)) return key;
  }

  return `src.${hashSlot(url)}`;
}

export function resolveMediaSlot(
  slotId: string,
  content?: Partial<WeddingDemoContent> | null,
  fallback?: WeddingMediaSlot | string | null
): WeddingMediaSlot | null {
  const stored = content?.media?.[slotId];
  const fallbackSlot =
    typeof fallback === "string"
      ? mediaSlotFromImageUrl(fallback)
      : fallback
        ? normalizeWeddingMediaSlot(fallback)
        : null;

  if (slotId === "hero") {
    const heroFallback =
      fallbackSlot ||
      (content?.heroImage ? mediaSlotFromImageUrl(content.heroImage) : null);
    return normalizeWeddingMediaSlot(stored, heroFallback);
  }

  const galleryMatch = /^gallery\.(\d+)$/.exec(slotId);
  if (galleryMatch) {
    const index = Number(galleryMatch[1]);
    const gallerySrc = Array.isArray(content?.galleryImages)
      ? content?.galleryImages[index]
      : "";
    return normalizeWeddingMediaSlot(
      stored,
      fallbackSlot || (gallerySrc ? mediaSlotFromImageUrl(gallerySrc) : null)
    );
  }

  return normalizeWeddingMediaSlot(stored, fallbackSlot);
}

export function applyMediaToContent(
  content: WeddingDemoContent,
  slotId: string,
  slot: WeddingMediaSlot | null
): WeddingDemoContent {
  const media = { ...(content.media || {}) };

  if (!slot || !slot.src) {
    delete media[slotId];
  } else {
    media[slotId] = slot;
  }

  const next: WeddingDemoContent = { ...content, media };

  if (slotId === "hero") {
    next.heroImage = slot?.type === "image" ? slot.src || "" : "";
    if (slot?.type === "video") {
      next.heroImage = "";
    }
  }

  const galleryMatch = /^gallery\.(\d+)$/.exec(slotId);
  if (galleryMatch) {
    const index = Number(galleryMatch[1]);
    const gallery = [...(content.galleryImages || [])];
    if (!slot?.src) {
      gallery[index] = "";
    } else {
      gallery[index] = slot.src;
    }
    const cleaned = gallery.filter(Boolean);
    next.galleryImages = cleaned.length > 0 ? cleaned : undefined;
  }

  return next;
}

export function collectContentMediaLibrary(content?: Partial<WeddingDemoContent> | null) {
  const items: WeddingMediaSlot[] = [];
  const seen = new Set<string>();

  function push(slot?: WeddingMediaSlot | null) {
    if (!slot?.src || seen.has(slot.src)) return;
    if (!isAllowedWeddingImageUrl(slot.src)) return;
    seen.add(slot.src);
    items.push(slot);
  }

  if (content?.heroImage) push(mediaSlotFromImageUrl(content.heroImage, "Hero"));
  for (const src of content?.galleryImages || []) {
    push(mediaSlotFromImageUrl(src));
  }
  for (const slot of Object.values(content?.media || {})) {
    push(normalizeWeddingMediaSlot(slot));
  }

  return items;
}

export function mediaElementStyle(slot?: WeddingMediaSlot | null) {
  const zoom = slot?.zoom && slot.zoom > 1 ? slot.zoom : 1;
  return {
    objectFit: (slot?.fit || "cover") as WeddingMediaFit,
    objectPosition: slot?.position || "50% 50%",
    transform: zoom > 1 ? `scale(${zoom})` : undefined,
    width: "100%",
    height: "100%",
  } as const;
}

export function optimizedMediaUrl(slot?: WeddingMediaSlot | null, width = 1600) {
  if (!slot?.src) return "";
  if (slot.type === "video") return slot.src;
  return getOptimizedWeddingImageUrl(slot.src, width) || slot.src;
}

function urlsMatch(a: string, b: string) {
  const left = stripQuery(sanitizeWeddingMediaUrl(a));
  const right = stripQuery(sanitizeWeddingMediaUrl(b));
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function stripQuery(url: string) {
  return url.split("?")[0].replace(/\/f_auto,q_auto[^/]*\//, "/");
}

function hashSlot(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
