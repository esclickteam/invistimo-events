export const EVENT_UPLOAD_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const EVENT_UPLOAD_MAX_IMAGE_MB = 8;
export const EVENT_UPLOAD_MAX_VIDEO_MB = 40;
export const EVENT_UPLOAD_MAX_IMAGE_BYTES = EVENT_UPLOAD_MAX_IMAGE_MB * 1024 * 1024;
export const EVENT_UPLOAD_MAX_VIDEO_BYTES = EVENT_UPLOAD_MAX_VIDEO_MB * 1024 * 1024;

export function eventUploadExpiresAt(from = new Date()) {
  return new Date(from.getTime() + EVENT_UPLOAD_TTL_MS);
}

export function isEventUploadExpired(expiresAt?: Date | string | null, now = new Date()) {
  if (!expiresAt) return true;
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() <= now.getTime();
}

export function serializeEventUpload(doc: {
  _id?: { toString(): string } | string;
  type?: string;
  url?: string;
  originalName?: string;
  uploadedByName?: string;
  createdAt?: Date | string;
  expiresAt?: Date | string;
  source?: string;
}) {
  return {
    id: String(doc._id || ""),
    type: doc.type === "video" ? ("video" as const) : ("image" as const),
    url: String(doc.url || ""),
    name: String(doc.originalName || ""),
    uploadedBy: String(doc.uploadedByName || "אורח"),
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt || ""),
    expiresAt:
      doc.expiresAt instanceof Date
        ? doc.expiresAt.toISOString()
        : String(doc.expiresAt || ""),
    source: doc.source === "couple" ? ("couple" as const) : ("guest" as const),
  };
}
