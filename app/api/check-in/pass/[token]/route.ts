import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import { loadGuestPassByToken } from "@/lib/checkIn/loadGuestPass";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    await dbConnect();
    const pass = await loadGuestPassByToken(token);
    if (!pass) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      pass,
    });
  } catch (err) {
    console.error("❌ GET check-in/pass:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
