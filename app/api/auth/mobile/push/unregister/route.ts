import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { wantsMobileSession } from "@/lib/auth/mobileClient";
import { hashRefreshToken } from "@/lib/auth/mobileSession";
import MobileRefreshToken from "@/models/MobileRefreshToken";
import { revokeMobilePushDevice } from "@/lib/push/mobilePushDevices";

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

    await connectDB();

    let userId = "";
    const auth = await getUserIdFromRequest(req);
    if (auth?.userId && !auth.impersonated) {
      userId = String(auth.userId);
    } else {
      const refreshToken = String(body?.refreshToken || "").trim();
      if (refreshToken) {
        const session = await MobileRefreshToken.findOne({
          tokenHash: hashRefreshToken(refreshToken),
        }).select("userId revokedAt");
        if (session && !session.revokedAt) {
          userId = String(session.userId);
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    await revokeMobilePushDevice({
      userId,
      expoPushToken: String(body?.expoPushToken || ""),
      deviceId: String(body?.deviceId || ""),
    });

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
