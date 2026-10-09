import { NextResponse } from "next/server";
import { bridgeDemoRequest } from "@/lib/demo/interactive/bridge";
import { ensureDemoSession } from "@/lib/demo/interactive/sessionCookie";
import { getSession } from "@/lib/demo/interactive/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await ensureDemoSession();
  const body = await req.json().catch(() => ({}));
  const method = String(body?.method || "GET");
  const path = String(body?.path || "/");
  const payload = body?.body ?? null;

  if (!path.startsWith("/api/") || path.startsWith("/api/demo")) {
    return NextResponse.json(
      { success: false, message: "נתיב לא מורשה בגשר הדמו" },
      { status: 400 }
    );
  }

  const result = bridgeDemoRequest(session, method, path, payload);
  const fresh = getSession(session.id);
  const response = NextResponse.json(
    { ...result.json, demoSession: fresh },
    { status: result.status }
  );
  response.headers.set("x-invistimo-demo", "1");
  return response;
}
