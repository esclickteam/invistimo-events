import { NextResponse } from "next/server";
import { ensureDemoSession } from "@/lib/demo/interactive/sessionCookie";
import { setSessionMode } from "@/lib/demo/interactive/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await ensureDemoSession();
  return NextResponse.json({ success: true, session });
}

export async function POST(req: Request) {
  const session = await ensureDemoSession();
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "free" || body?.mode === "guided" ? body.mode : null;
  const next = mode ? setSessionMode(session.id, mode) : session;
  return NextResponse.json({ success: true, session: next || session });
}
