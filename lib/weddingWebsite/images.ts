import type { WeddingDemoContent, WeddingTemplate } from "@/types/weddingWebsite";

const ALLOWED_IMAGE_HOST_RE = /^https:\/\//i;
const CLOUDINARY_UPLOAD_MARKER = "/upload/";

const BROKEN_UNSPLASH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/photo-1465495976277-4387d110b3ca/g, "photo-1519741497674-611481863552"],
  [/photo-1523438885200-e635ba2c371(?!e)/g, "photo-1519225421980-715cb0215aed"],
];

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function repairWeddingImageUrl(value: unknown) {
  let url = cleanString(value);
  if (!url) return "";
  for (const [pattern, replacement] of BROKEN_UNSPLASH_REPLACEMENTS) {
    url = url.replace(pattern, replacement);
  }
  return url;
}

export function isAllowedWeddingImageUrl(value: unknown) {
  const url = cleanString(value);
  if (!url) return false;
  if (!ALLOWED_IMAGE_HOST_RE.test(url)) return false;
  if (url.toLowerCase().startsWith("javascript:")) return false;
  return true;
}

export function sanitizeWeddingImageUrl(value: unknown) {
  const url = isAllowedWeddingImageUrl(value) ? repairWeddingImageUrl(value) : "";
  return url;
}

export function sanitizeWeddingImageUrls(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(sanitizeWeddingImageUrl).filter(Boolean);
}

export function getOptimizedWeddingImageUrl(
  value: unknown,
  width = 1200
) {
  const url = sanitizeWeddingImageUrl(value);
  if (!url) return "";

  if (!url.includes("res.cloudinary.com") || !url.includes(CLOUDINARY_UPLOAD_MARKER)) {
    return url;
  }

  const [beforeUpload, afterUpload] = url.split(CLOUDINARY_UPLOAD_MARKER);
  if (!beforeUpload || !afterUpload) return url;

  const rest = afterUpload.replace(/^\/+/, "");
  if (!rest) return url;
  if (/^(f_auto|q_auto|c_|w_\d+)/.test(rest)) return url;

  const safeWidth = Number.isFinite(width) ? Math.min(Math.max(Math.round(width), 200), 2400) : 1200;
  return `${beforeUpload}${CLOUDINARY_UPLOAD_MARKER}f_auto,q_auto,c_limit,w_${safeWidth}/${rest}`;
}

/**
 * Overlay customer images onto a template for render only.
 * Never persist template demo images as customer data.
 */
export function overlayWeddingTemplateImages(
  template: WeddingTemplate | null | undefined,
  content?: Partial<WeddingDemoContent> | null
): WeddingTemplate | null {
  if (!template) return null;

  const heroSlot = content?.media?.hero;
  const heroFromSlot = heroSlot?.type === "image" ? sanitizeWeddingImageUrl(heroSlot.src) : "";
  const heroRemoved = Boolean(heroSlot) && !sanitizeWeddingImageUrl(heroSlot?.src) && heroSlot?.type !== "video";
  const heroImage = heroFromSlot || sanitizeWeddingImageUrl(content?.heroImage);
  const customGallery = Array.isArray(content?.galleryImages)
    ? sanitizeWeddingImageUrls(content?.galleryImages)
    : [];
  const galleryImages = customGallery.length > 0 ? customGallery : null;

  return {
    ...template,
    heroImage: heroRemoved
      ? ""
      : getOptimizedWeddingImageUrl(heroImage || template.heroImage, 1800) || template.heroImage,
    galleryImages: galleryImages
      ? galleryImages.map((src) => getOptimizedWeddingImageUrl(src, 1100) || src)
      : template.galleryImages.map((src) => getOptimizedWeddingImageUrl(src, 1100) || src),
  };
}
