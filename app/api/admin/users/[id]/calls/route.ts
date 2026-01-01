import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    /* ===== Auth ===== */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    if (decoded.role !== "admin") {
      return NextResponse.json(
        { success: false },
        { status: 403 }
      );
    }

    /* ===== Params ===== */
    const { id } = await context.params;

    /* ===== Body ===== */
    const body = await request.json();
    const { includeCalls, callsRounds } = body;

    /* ===== Update ===== */
    await User.findByIdAndUpdate(id, {
      includeCalls,
      callsRounds,
      callsEnabledBy: "admin",
      callsEnabledAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ADMIN CALLS UPDATE ERROR:", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
