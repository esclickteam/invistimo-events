import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.role !== "admin") {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    /* ================= USERS (PAID ONLY) ================= */
    const users = await User.find({
      hasPaid: true,
      isDemoUser: { $ne: true },
    })
      .select(`
        email
        name
        role
        plan
        guests
        paidAmount
        includeCalls
        includeCreditGifts
        createdAt
      `)
      .sort({ createdAt: -1 })
      .lean();

    /* ================= TOTAL REVENUE ================= */
    const revenueAgg = await User.aggregate([
      {
        $match: {
          hasPaid: true,
          isDemoUser: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$paidAmount" },
        },
      },
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue ?? 0;

    return NextResponse.json(
      {
        success: true,
        users,
        totalRevenue, // ✅ זה המספר שצריך להופיע בכרטיס
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("ADMIN USERS ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
