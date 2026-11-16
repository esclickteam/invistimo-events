import { NextResponse } from "next/server";
import { absPathForKey, verifyMediaSignature } from "@/lib/storage";
import { promises as fs } from "fs";
import path from "path";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";
  const exp = Number(url.searchParams.get("exp") || 0);
  const sig = url.searchParams.get("sig") || "";

  if (!key || !verifyMediaSignature(key, exp, sig)) {
    return NextResponse.json({ ok: false, error: "קישור לא תקף" }, { status: 403 });
  }

  try {
    const abs = absPathForKey(key);
    const buf = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "קובץ לא נמצא" }, { status: 404 });
  }
}
