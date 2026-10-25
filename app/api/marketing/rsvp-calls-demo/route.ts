/**
 * Public marketing demo audio for /rsvp/calls.
 * Serves a cached Dana IVR MP3 (public file or R2). Generates once on miss
 * using the same locked Dana voice + compose path as production IVR.
 * Never returns API keys or internal voice diagnostics.
 */

import { NextResponse } from "next/server";
import { getOrCreateRsvpCallsDanaDemo } from "@/lib/marketing/rsvpCallsDanaDemo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
  "Access-Control-Expose-Headers": "Content-Length, Accept-Ranges, Content-Type",
};

function audioResponse(buffer: Buffer, contentType: string, method: "GET" | "HEAD") {
  const headers = {
    ...CORS_HEADERS,
    "Content-Type": contentType || "audio/mpeg",
    "Content-Length": String(buffer.length),
    "Accept-Ranges": "bytes",
    // Long cache — object is content-addressed by controlled publish / R2 key.
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
  };
  if (method === "HEAD") {
    return new NextResponse(null, { status: 200, headers });
  }
  return new NextResponse(new Uint8Array(buffer), { status: 200, headers });
}

function unavailable() {
  return NextResponse.json(
    {
      error: "DEMO_AUDIO_UNAVAILABLE",
      message: "קובץ ההדגמה של דנה אינו זמין כרגע",
    },
    {
      status: 503,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function handle(method: "GET" | "HEAD") {
  try {
    const demo = await getOrCreateRsvpCallsDanaDemo();
    if (!demo.buffer?.length) return unavailable();
    return audioResponse(demo.buffer, demo.contentType, method);
  } catch (err) {
    console.error(
      "[marketing/rsvp-calls-demo]",
      err instanceof Error ? err.message : err
    );
    return unavailable();
  }
}

export async function GET() {
  return handle("GET");
}

export async function HEAD() {
  return handle("HEAD");
}
