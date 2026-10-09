import { NextResponse } from "next/server";
import {
  commitDemoSession,
  ensureDemoSession,
} from "@/lib/demo/interactive/sessionCookie";
import { resetSession } from "@/lib/demo/interactive/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await ensureDemoSession();
  const next = resetSession(session.id);
  await commitDemoSession(next);
  return NextResponse.json({ success: true, session: next });
}
