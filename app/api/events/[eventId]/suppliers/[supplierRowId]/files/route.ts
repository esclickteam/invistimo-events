import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import db from "@/lib/db";
import EventSupplier from "@/models/EventSupplier";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; supplierRowId: string }> }
) {
  await db();

  const { supplierRowId } = await params;

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  const uploadedFiles: Array<{
    name: string;
    url: string;
    publicId: string;
    type?: string;
  }> = [];

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `events/suppliers/${supplierRowId}`,
            resource_type: "raw",

            // ⭐⭐ השינויים החשובים ⭐⭐
            access_mode: "public",          // ⬅️ מבטל 401
            flags: "attachment",            // מאפשר שליטה בתצוגה

            filename_override: file.name,   // שומר שם קובץ + סיומת
            use_filename: false,
            unique_filename: false,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    // 🔧 הפיכת ה-URL ל-inline לצפייה בדפדפן
    const inlineUrl = result.secure_url.replace(
      "/raw/upload/",
      "/raw/upload/fl_inline/"
    );

    uploadedFiles.push({
      name: file.name,
      url: inlineUrl,          // ⬅️ URL לצפייה
      publicId: result.public_id,
      type: file.type,
    });
  }

  const row = await EventSupplier.findByIdAndUpdate(
    supplierRowId,
    {
      $push: {
        files: { $each: uploadedFiles },
      },
    },
    { new: true }
  ).lean();

  return NextResponse.json(row?.files || []);
}
