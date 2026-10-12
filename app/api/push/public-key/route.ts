import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { getVapidConfig } from "@/lib/push/webPush";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const config = getVapidConfig();
  return NextResponse.json({
    success: true,
    configured: Boolean(config),
    publicKey: config?.publicKey || "",
  });
}
