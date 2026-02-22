import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: "NO_FILE" },
        { status: 400 }
      );
    }

    // המרה ל־Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // העלאה ל־Cloudinary
    const uploadResult: any = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "invistimo/invitations",
            resource_type: "image",
            overwrite: true,
            quality: "auto",
            fetch_format: "auto",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url, // 👈 זה מה ששומרים ב־DB
    });
  } catch (err) {
    console.error("❌ upload-image error:", err);
    return NextResponse.json(
      { success: false, error: "UPLOAD_FAILED" },
      { status: 500 }
    );
  }
}