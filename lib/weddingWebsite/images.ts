import type { WeddingDemoContent, WeddingTemplate } from "@/types/weddingWebsite";

const ALLOWED_IMAGE_HOST_RE = /^https:\/\//i;
const CLOUDINARY_UPLOAD_MARKER = "/upload/";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isAllowedWeddingImageUrl(value: unknown) {
  const url = cleanString(value);
  if (!url) return false;
  if (!ALLOWED_IMAGE_HOST_RE.test(url)) return false;
  if (url.toLowerCase().startsWith("javascript:")) return false;
  return true;
}

export function sanitizeWeddingImageUrl(value: unknown) {
  return isAllowedWeddingImageUrl(value) ? cleanString(value) : "";
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

  const heroImage = sanitizeWeddingImageUrl(content?.heroImage);
  const hasCustomGallery = Array.isArray(content?.galleryImages);
  const galleryImages = hasCustomGallery
    ? sanitizeWeddingImageUrls(content?.galleryImages)
    : null;

  return {
    ...template,
    heroImage: getOptimizedWeddingImageUrl(heroImage || template.heroImage, 1800) || template.heroImage,
    galleryImages:
      galleryImages && galleryImages.length > 0
        ? galleryImages.map((src) => getOptimizedWeddingImageUrl(src, 1100) || src)
        : galleryImages
          ? galleryImages
          : template.galleryImages,
  };
}
