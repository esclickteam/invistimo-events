import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/* =========================================================
   GET – ASSIGNEES (PRODUCERS + STAFF)
========================================================= */
export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== "admin") {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const [producers, staff] = await Promise.all([
      User.find({ role: "producer" })
        .select("name email")
        .sort({ name: 1 })
        .lean(),

      User.find({ role: "staff" })
        .select("name email")
        .sort({ name: 1 })
        .lean(),
    ]);

    return NextResponse.json(
      {
        success: true,
        producers,
        staff,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("❌ ASSIGNEES GET ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
