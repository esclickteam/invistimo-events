import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";

import User from "@/models/User";
import Invitation from "@/models/Invitation";

// 🔥 חובה לאדמין – בלי cache
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    /* ======================================================
       AUTH
    ====================================================== */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ======================================================
       COUNTS + REVENUE (SOURCE OF TRUTH = USERS)
    ====================================================== */
    const [
      usersCount,
      invitationsCount,
      callsCount,
      revenueAgg,
    ] = await Promise.all([
      // 👤 סה״כ משתמשים
      User.countDocuments(),

      // ✉️ סה״כ אירועים / הזמנות
      Invitation.countDocuments(),

      // ☎️ שירותי שיחות פעילים
      User.countDocuments({ includeCalls: true }),

      // 💰 הכנסות – רק מי ששילם בפועל
      User.aggregate([
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
      ]),
    ]);

    const revenue =
      revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    /* ======================================================
       RESPONSE
    ====================================================== */
    return NextResponse.json(
      {
        users: usersCount,
        invitations: invitationsCount,
        calls: callsCount,
        revenue, // ✅ זה חייב להיות 2797
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("❌ Admin stats error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
