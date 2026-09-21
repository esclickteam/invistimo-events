import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signAccessJwt } from "@/lib/auth/issueAccessJwt";
import { rotateMobileRefreshSession } from "@/lib/auth/mobileSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const refreshToken = String(body?.refreshToken || "").trim();
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "INVALID_SESSION" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    await connectDB();
    const rotated = await rotateMobileRefreshSession(refreshToken);
    if (!rotated.ok) {
      return NextResponse.json(
        { success: false, error: "INVALID_SESSION" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const user = await User.findById(rotated.userId);
    if (!user || (user as any).isActive === false) {
      return NextResponse.json(
        { success: false, error: "INVALID_SESSION" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const freshAuthVersion = Number((user as any).authVersion ?? 0);
    if (freshAuthVersion !== rotated.authVersion) {
      return NextResponse.json(
        { success: false, error: "INVALID_SESSION" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const token = signAccessJwt(user);

    return NextResponse.json(
      {
        success: true,
        token,
        refreshToken: rotated.refreshToken,
        refreshExpiresAt: rotated.expiresAt,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("MOBILE REFRESH ERROR");
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
