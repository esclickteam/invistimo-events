import crypto from "crypto";
import cloudinary from "@/lib/cloudinary";
import { cloudinaryFolder } from "@/lib/cloudinaryFolder";

export const VENUE_FILE_MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_MIME_PREFIXES = ["image/"] as const;

const ALLOWED_EXACT_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export type VenueUploadResult = {
  url: string;
  publicId: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export class VenueStorageError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "VenueStorageError";
    this.status = status;
  }
}

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

export function isAllowedVenueMimeType(mimeType: string) {
  const clean = cleanString(mimeType).toLowerCase();

  if (!clean) return false;
  if (ALLOWED_EXACT_MIMES.has(clean)) return true;

  return ALLOWED_MIME_PREFIXES.some((prefix) => clean.startsWith(prefix));
}

export function validateVenueFileInput(file: File) {
  if (!file || file.size <= 0) {
    throw new VenueStorageError("לא נבחר קובץ תקין", 400);
  }

  if (file.size > VENUE_FILE_MAX_BYTES) {
    throw new VenueStorageError("הקובץ גדול מדי (מקסימום 15MB)", 400);
  }

  const mimeType = cleanString(file.type).toLowerCase();

  if (!isAllowedVenueMimeType(mimeType)) {
    throw new VenueStorageError(
      "סוג קובץ לא נתמך. מותרים תמונות ו-PDF בלבד",
      400
    );
  }

  return mimeType;
}

function sanitizeFileStem(name: string) {
  return (
    name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^\w\u0590-\u05FF.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "venue-file"
  );
}

export function getCloudinaryResourceType(
  mimeType: string
): "image" | "raw" {
  if (mimeType === "application/pdf") {
    return "image";
  }

  if (mimeType.startsWith("image/")) {
    return "image";
  }

  return "raw";
}

export async function fileToBuffer(file: File | Blob) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadVenueFileToCloudinary(params: {
  venueId: string;
  file: File;
  kind?: string;
  folderSuffix?: string;
}): Promise<VenueUploadResult> {
  const { venueId, file } = params;

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new VenueStorageError(
      "שירות העלאת קבצים אינו מוגדר (CLOUDINARY)",
      503
    );
  }

  const mimeType = validateVenueFileInput(file);
  const buffer = await fileToBuffer(file);
  const resourceType = getCloudinaryResourceType(mimeType);

  const cleanOriginalName = cleanString(file.name) || "venue-file";
  const stem = sanitizeFileStem(cleanOriginalName);
  const kindPart = cleanString(params.kind) || "file";
  const suffix = cleanString(params.folderSuffix);

  const publicId = `${kindPart}-${Date.now()}-${crypto
    .randomBytes(6)
    .toString("hex")}-${stem}`;

  const folder = suffix
    ? cloudinaryFolder("venues", venueId, suffix)
    : cloudinaryFolder("venues", venueId);

  const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(uploadResult);
      }
    );

    uploadStream.end(buffer);
  });

  return {
    url: String(result.secure_url || result.url || ""),
    publicId: String(result.public_id || ""),
    originalName: cleanOriginalName,
    mimeType,
    size: file.size,
  };
}

export async function deleteVenueFileFromCloudinary(
  publicId: string,
  mimeType?: string
) {
  if (!publicId) return;

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new VenueStorageError(
      "שירות העלאת קבצים אינו מוגדר (CLOUDINARY)",
      503
    );
  }

  const resourceType = getCloudinaryResourceType(
    cleanString(mimeType) || "application/pdf"
  );

  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
}
