import { v2 as cloudinary } from "cloudinary";
import { cloudinaryFolder } from "@/lib/cloudinaryFolder";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

export function assertCloudinaryConfig() {
  const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);
  const hasSeparateKeys = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

  if (!hasCloudinaryUrl && !hasSeparateKeys) {
    throw new Error("חסרה הגדרת Cloudinary בשרת.");
  }

  if (!hasCloudinaryUrl) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

export async function uploadWeddingFileToCloudinary({
  file,
  invitationId,
  folderKind = "wedding-website",
  resourceType,
}: {
  file: File;
  invitationId: string;
  folderKind?: "wedding-website" | "event-uploads";
  resourceType: "image" | "video" | "auto";
}) {
  assertCloudinaryConfig();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const originalName = cleanString(file.name).replace(/\.[^/.]+$/, "");
  const safeName =
    originalName
      .replace(/[^\w\u0590-\u05FF-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "wedding-image";

  const folder = cloudinaryFolder(folderKind, invitationId);
  const publicId = `${safeName}-${Date.now()}`;

  return await new Promise<{
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
  }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: false,
        invalidate: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error("העלאת התמונה נכשלה."));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}
