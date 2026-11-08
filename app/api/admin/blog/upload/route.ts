import crypto from "node:crypto";
import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { cloudinaryFolder } from "@/lib/cloudinaryFolder";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId || auth.role !== "admin" || auth.impersonated) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json({ ok: false, error: "העלאת תמונות לא מוגדרת" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "לא נבחרה תמונה" }, { status: 400 });
  }
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "אפשר להעלות תמונה עד 8MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const publicId = `cover-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

  try {
    const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: cloudinaryFolder("blog"),
          public_id: publicId,
          resource_type: "image",
          overwrite: false,
        },
        (error, result) => {
          if (error || !result) reject(error || new Error("upload failed"));
          else resolve(result);
        }
      );
      stream.end(buffer);
    });
    return NextResponse.json({ ok: true, url: uploaded.secure_url });
  } catch (error) {
    console.error("[blog] cover upload failed", error);
    return NextResponse.json({ ok: false, error: "ההעלאה נכשלה" }, { status: 500 });
  }
}
