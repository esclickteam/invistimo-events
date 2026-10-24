import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { NextResponse } from "next/server";
import { readStudioAuth } from "@/lib/invitationStudio/access";
import { syncDelayMs } from "@/lib/invitationStudio/audioPlan";
import type { StudioMusic } from "@/lib/invitationStudio/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIBRARY = path.join(process.cwd(), "public", "invitation-studio", "music", "evening-motif.wav");

function run(bin: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-500) || `ffmpeg ${code}`));
    });
  });
}

function readMusic(raw: string): StudioMusic {
  const source = JSON.parse(raw) as Partial<StudioMusic>;
  const mode = source.mode === "library" || source.mode === "upload" ? source.mode : "none";
  const dataUrl = String(source.dataUrl || "");
  const allowed = /^data:audio\/(mpeg|wav|webm|mp4|x-m4a);base64,[a-z0-9+/=\s]+$/i.test(dataUrl);
  if (mode === "upload" && (!source.rightsConfirmed || !allowed || dataUrl.length > 2_200_000)) {
    return { mode: "none", start: 0, end: 0, fadeIn: 0, fadeOut: 0, volume: 0, sync: "start" };
  }
  const start = Math.max(0, Number(source.start) || 0);
  const end = Math.max(start, Number(source.end) || start);
  return {
    mode,
    dataUrl: mode === "upload" ? dataUrl : undefined,
    start,
    end,
    fadeIn: Math.min(4, Math.max(0, Number(source.fadeIn) || 0)),
    fadeOut: Math.min(4, Math.max(0, Number(source.fadeOut) || 0)),
    volume: Math.min(1, Math.max(0, Number(source.volume) || 0.8)),
    sync: source.sync === "names" || source.sync === "details" ? source.sync : "start",
    rightsConfirmed: Boolean(source.rightsConfirmed),
  };
}

export async function POST(req: Request) {
  const session = await readStudioAuth(req);
  if (!session) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });

  const form = await req.formData();
  const video = form.get("video");
  if (!(video instanceof File) || video.size < 1000 || video.size > 28_000_000) {
    return NextResponse.json({ success: false, error: "VIDEO" }, { status: 400 });
  }
  const music = readMusic(String(form.get("music") || "{\"mode\":\"none\"}"));
  const speed = Math.max(0.6, Math.min(1.6, Number(form.get("speed")) || 1));
  const dir = await mkdtemp(path.join(tmpdir(), "studio-film-"));
  try {
    const webm = path.join(dir, "invite.webm");
    const mp4 = path.join(dir, "invite.mp4");
    await writeFile(webm, Buffer.from(await video.arrayBuffer()));
    const bin = require("ffmpeg-static") as string;
    if (music.mode === "none" || music.end <= music.start) {
      await run(bin, ["-y", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
    } else {
      let audioPath = LIBRARY;
      if (music.mode === "upload" && music.dataUrl) {
        const match = music.dataUrl.match(/^data:audio\/([a-z0-9.+-]+);base64,([\s\S]+)$/i);
        const kind = match?.[1] || "wav";
        const ext = kind.includes("mpeg") ? "mp3" : kind.includes("wav") ? "wav" : "m4a";
        audioPath = path.join(dir, `upload.${ext}`);
        await writeFile(audioPath, Buffer.from(match?.[2] || "", "base64"));
      }
      const length = Math.max(0.2, music.end - music.start);
      const fadeOut = Math.min(music.fadeOut, length / 2);
      const fadeIn = Math.min(music.fadeIn, length / 2);
      const fadeOutAt = Math.max(0, length - fadeOut);
      const delay = syncDelayMs(music.sync, speed);
      const filter = `[1:a]atrim=start=${music.start.toFixed(3)}:end=${music.end.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${fadeIn.toFixed(3)},afade=t=out:st=${fadeOutAt.toFixed(3)}:d=${Math.max(0.01, fadeOut).toFixed(3)},volume=${music.volume.toFixed(3)},adelay=${delay}|${delay}[a]`;
      await run(bin, [
        "-y",
        "-i",
        webm,
        "-i",
        audioPath,
        "-filter_complex",
        filter,
        "-map",
        "0:v:0",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        mp4,
      ]);
    }
    const bytes = await readFile(mp4);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": "attachment; filename=invitation.mp4",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "EXPORT_FAILED" }, { status: 500 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
