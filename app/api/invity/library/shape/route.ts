import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function GET() {
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: "shapes/",
      resource_type: "image",
      max_results: 100,
    });

    const shapes = result.resources.map((r: any) => ({
      name: r.public_id.split("/").pop(),
      url: r.secure_url,
    }));

    return NextResponse.json(shapes);
  } catch (err) {
    console.error("❌ Cloudinary fetch failed:", err);
    return NextResponse.json({ error: "Failed to load shapes" }, { status: 500 });
  }
}
