import { NextResponse } from "next/server";
import { bridgeDemoRequest } from "@/lib/demo/interactive/bridge";
import {
  commitDemoSession,
  readDemoSession,
} from "@/lib/demo/interactive/sessionCookie";
import { getSession } from "@/lib/demo/interactive/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await readDemoSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "סשן הדמו לא פעיל" },
      { status: 404 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "");
  const result = bridgeDemoRequest(
    session,
    "POST",
    `/api/invitationGuests/respondByToken/${encodeURIComponent(token)}`,
    body
  );
  await commitDemoSession(getSession(session.id));
  return NextResponse.json(result.json, { status: result.status });
}
