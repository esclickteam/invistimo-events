import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { revokeMobileRefreshToken } from "@/lib/auth/mobileSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const refreshToken = String(body?.refreshToken || "").trim();
    if (refreshToken) {
      await connectDB();
      await revokeMobileRefreshToken(refreshToken);
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
