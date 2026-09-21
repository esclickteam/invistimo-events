import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { hashRefreshToken, revokeMobileRefreshToken } from "@/lib/auth/mobileSession";
import MobileRefreshToken from "@/models/MobileRefreshToken";
import { revokeMobilePushDevice } from "@/lib/push/mobilePushDevices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const refreshToken = String(body?.refreshToken || "").trim();
    if (refreshToken) {
      await connectDB();
      const existing = await MobileRefreshToken.findOne({
        tokenHash: hashRefreshToken(refreshToken),
      }).select("userId");
      await revokeMobileRefreshToken(refreshToken);
      if (existing?.userId) {
        await revokeMobilePushDevice({
          userId: String(existing.userId),
          expoPushToken: String(body?.expoPushToken || ""),
          deviceId: String(body?.deviceId || ""),
        });
      }
    }

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
