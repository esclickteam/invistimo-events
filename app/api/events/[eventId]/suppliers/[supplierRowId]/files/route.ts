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

      resource_type:
        file.type === "application/pdf"
          ? "raw"
          : "image",

      format:
        file.type === "application/pdf"
          ? "pdf"
          : undefined,

      filename_override: file.name,

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

    uploadedFiles.push({
      name: file.name,              // למשל: "הסכם ספק.pdf"
      url: result.secure_url,       // URL תקין
      publicId: result.public_id,   // כולל .pdf
      type: file.type,              // application/pdf
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
