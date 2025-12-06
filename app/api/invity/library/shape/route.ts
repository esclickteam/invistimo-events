import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

// 🟣 לוג שרת – לבדוק שה־ENV נטענים
console.log("🔍 Cloudinary ENV Check:", {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? "OK" : "MISSING",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? "OK" : "MISSING",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? "OK" : "MISSING",
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function GET() {
  try {
    console.log("📡 Fetching Cloudinary resources with prefix: shapes/");

    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: "shapes/",
      resource_type: "image",
      max_results: 100,
    });

    console.log("✅ Cloudinary result:", result);

    const shapes = result.resources.map((r: any) => ({
      name: r.public_id.split("/").pop(),
      url: r.secure_url,
    }));

    return NextResponse.json({
      success: true,
      count: shapes.length,
      shapes,
      raw: result, // 🟣 נחזיר גם RAW לבדיקה
    });
  } catch (err: any) {
    console.error("❌ Cloudinary fetch failed:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || err?.error?.message || "Failed to load shapes",
        cloudinaryError: err,
      },
      { status: 500 }
    );
  }
}
