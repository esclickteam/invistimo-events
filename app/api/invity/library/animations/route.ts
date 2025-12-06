import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function GET() {
  try {
    // ⭐ חיפוש לפי תיקייה אמיתית בקלאודינרי
    // עובד ל-GIF / WEBP / MP4 / WEBM / JSON
    const result = await cloudinary.search
      .expression('folder="animations"') // ← התיקון הקריטי
      .sort_by("public_id", "desc")
      .max_results(200)
      .execute();

    const data = (result.resources || []).map((r: any) => ({
      name: r.public_id.split("/").pop(),
      url: r.secure_url,
      width: r.width,
      height: r.height,
      format: r.format,          // gif / webp / mp4 / json
      resource_type: r.resource_type, // image / video / raw
    }));

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("❌ Animations fetch error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load animations" },
      { status: 500 }
    );
  }
}
