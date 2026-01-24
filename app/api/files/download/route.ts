import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const fileUrl = searchParams.get("url");
  const fileName = searchParams.get("name") || "file.pdf";

  if (!fileUrl) {
    return new NextResponse("Missing file url", { status: 400 });
  }

  const cloudinaryRes = await fetch(fileUrl);
  if (!cloudinaryRes.ok) {
    return new NextResponse("Failed to fetch file", { status: 500 });
  }

  const buffer = await cloudinaryRes.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": cloudinaryRes.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
