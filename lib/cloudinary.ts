import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export default cloudinary;

/* =========================================================
   High-quality image URL
   מסיר טרנספורמציות הקטנה/דחיסה מה-URL של Cloudinary
   ומחזיר את התמונה במקור באיכות מלאה.
   בשימוש בשליחת וואטסאפ כדי שהתמונה לא תישלח מטושטשת.
========================================================= */

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function isCloudinaryTransformSegment(segment: string) {
  const cleanSegment = cleanString(segment);

  if (!cleanSegment) return false;
  if (/^v\d+$/.test(cleanSegment)) return false;

  const parts = cleanSegment
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return false;

  return parts.every((part) =>
    /^(a|ar|b|bo|c|co|dpr|e|f|fl|g|h|l|o|q|r|t|u|w|x|y|z)_[^/]+$/.test(part)
  );
}

export function getHighQualityCloudinaryImageUrl(value: unknown) {
  const url = cleanString(value);

  if (!url) return "";

  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  const [beforeUpload, afterUpload] = url.split("/upload/");

  if (!beforeUpload || !afterUpload) return url;

  const parts = afterUpload.split("/").filter(Boolean);

  while (parts.length > 0 && isCloudinaryTransformSegment(parts[0])) {
    parts.shift();
  }

  const cleanedAfterUpload = parts.join("/");

  if (!cleanedAfterUpload) return url;

  return `${beforeUpload}/upload/${cleanedAfterUpload}`;
}
