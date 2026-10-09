import { NextResponse } from "next/server";
import { bridgeDemoRequest } from "@/lib/demo/interactive/bridge";
import {
  commitDemoSession,
  readDemoSession,
} from "@/lib/demo/interactive/sessionCookie";
import { getSession } from "@/lib/demo/interactive/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await readDemoSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "סשן הדמו לא פעיל" },
      { status: 404 }
    );
  }
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const result = bridgeDemoRequest(
    session,
    "GET",
    `/api/invite/demo-share?token=${encodeURIComponent(token)}`,
    null
  );
  await commitDemoSession(getSession(session.id));
  return NextResponse.json(result.json, { status: result.status });
}
