import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "forms",
      "tofes-101.pdf"
    );

    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="tofes-101.pdf"',
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("DOWNLOAD FORM 101 FAILED:", error);

    return NextResponse.json(
      { error: "לא ניתן להוריד את טופס 101" },
      { status: 500 }
    );
  }
}