import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { wantsMobileSession } from "@/lib/auth/mobileClient";
import { registerMobilePushDevice } from "@/lib/push/mobilePushDevices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!wantsMobileSession(req, body)) {
      return NextResponse.json(
        { success: false, error: "INVALID_CLIENT" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId || auth.impersonated) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    await connectDB();
    const result = await registerMobilePushDevice({
      userId: String(auth.userId),
      expoPushToken: String(body?.expoPushToken || ""),
      deviceId: String(body?.deviceId || ""),
      platform: String(body?.platform || ""),
      deviceLabel: String(body?.deviceLabel || ""),
      enabled: body?.enabled !== false,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        enabled: result.device.enabled !== false,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
