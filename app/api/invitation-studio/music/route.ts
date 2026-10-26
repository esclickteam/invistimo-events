import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { readStudioSettings } from "@/lib/invitationStudio/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUNDLED = path.join(process.cwd(), "public", "invitation-studio", "music", "evening-motif.wav");

export async function GET() {
  const settings = await readStudioSettings();
  const dataUrl = settings.music.dataUrl;
  if (dataUrl) {
    const match = dataUrl.match(/^data:(audio\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
    if (match) {
      const bytes = Buffer.from(match[2], "base64");
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": match[1],
          "Cache-Control": "private, max-age=60",
          "Content-Disposition": `inline; filename="${settings.music.fileName || "studio-music"}"`,
        },
      });
    }
  }
  const bytes = await readFile(BUNDLED);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": 'inline; filename="evening-motif.wav"',
    },
  });
}
