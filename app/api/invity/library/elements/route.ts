import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function GET() {
  try {
    // ✅ טוען לפי תיקייה אמיתית בקלאודינרי
    const result = await cloudinary.search
      .expression("folder:elements/*")
      .sort_by("public_id", "desc")
      .max_results(200)
      .execute();

    const data = (result.resources || []).map((r: any) => ({
      name: r.public_id.split("/").pop(),
      url: r.secure_url,
      width: r.width,
      height: r.height,
      format: r.format,
      resource_type: r.resource_type,
    }));

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("❌ Elements fetch error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load elements" },
      { status: 500 }
    );
  }
}
