import { NextResponse } from "next/server";
import { applyExplicitDemoAction } from "@/lib/demo/interactive/bridge";
import {
  commitDemoSession,
  ensureDemoSession,
} from "@/lib/demo/interactive/sessionCookie";
import { getSession, patchTour } from "@/lib/demo/interactive/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await ensureDemoSession();
  const body = await req.json().catch(() => ({}));

  if (body?.type === "tour") {
    const next = patchTour(session.id, body.tour || {});
    await commitDemoSession(next);
    return NextResponse.json({ success: true, session: next });
  }

  const result = applyExplicitDemoAction(session.id, body);
  if (!result) {
    return NextResponse.json(
      { success: false, message: "פעולת הדמו לא זוהתה" },
      { status: 400 }
    );
  }

  const fresh = getSession(session.id);
  await commitDemoSession(fresh);
  return NextResponse.json({
    success: true,
    simulated: true,
    session: fresh,
    result,
  });
}
