/**
 * Delivery URL for an invitation image fetched by WhatsApp.
 *
 * Stored originals are often palette PNGs (Cloudinary `format: "png"` +
 * `quality: auto:best`) and sometimes carry an ICC profile or an alpha
 * channel. WhatsApp Web/Desktop decodes that PNG. The iOS and Android
 * clients transcode it to JPEG: indexed color and transparency become a
 * large black region under the artwork, while the desktop app still looks
 * correct.
 *
 * The URL below is the file WhatsApp actually downloads: a baseline
 * (non-progressive) sRGB JPEG, alpha flattened onto white, long edge capped
 * at 1600px without upscaling or cropping the artwork.
 */

const TRANSFORM =
  "c_limit,w_1600,h_2400/b_rgb:FFFFFF,cs_srgb,f_jpg,fl_progressive:none,q_92";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function isTransformSegment(segment: string) {
  const parts = segment
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return false;

  return parts.every((part) =>
    /^(a|ar|b|bo|c|co|cs|dpr|e|f|fl|g|h|l|o|q|r|t|u|w|x|y|z)_[^/]+$/.test(
      part
    )
  );
}

/** Strip Cloudinary delivery transforms and return the stored original URL. */
export function stripCloudinaryTransforms(value: unknown) {
  const url = cleanString(value);

  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  const [beforeUpload, afterUpload] = url.split("/upload/");
  if (!beforeUpload || !afterUpload) return url;

  const parts = afterUpload.split("/").filter(Boolean);

  while (parts.length > 0 && isTransformSegment(parts[0])) {
    parts.shift();
  }

  const cleaned = parts.join("/");
  if (!cleaned) return url;

  return `${beforeUpload}/upload/${cleaned}`;
}

function withJpegExtension(publicPath: string) {
  return publicPath.replace(
    /\.(png|webp|gif|avif|jpe?g)(\?.*)?$/i,
    ".jpg$2"
  );
}

export function toWhatsappInvitationImageUrl(value: unknown) {
  const url = cleanString(value);
  if (!url) return "";

  const stripped = stripCloudinaryTransforms(url);
  if (!stripped.includes("res.cloudinary.com") || !stripped.includes("/upload/")) {
    return stripped;
  }

  const [beforeUpload, afterUpload] = stripped.split("/upload/");
  if (!beforeUpload || !afterUpload) return stripped;

  const publicPath = withJpegExtension(afterUpload.replace(/^\/+/, ""));
  if (!publicPath || publicPath === ".jpg") return stripped;

  return `${beforeUpload}/upload/${TRANSFORM}/${publicPath}`;
}
