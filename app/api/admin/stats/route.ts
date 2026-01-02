import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";

import User from "@/models/User";
import Invitation from "@/models/Invitation";
import Payment from "@/models/Payment";

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
       COUNTS + REVENUE
    ====================================================== */
    const [users, invitations, calls, revenueAgg] = await Promise.all([
      User.countDocuments(),

      Invitation.countDocuments(),

      // שירותי שיחות פעילים
      User.countDocuments({ includeCalls: true }),

      // 💰 סה"כ הכנסות אמיתיות בלבד
      Payment.aggregate([
        {
          $match: {
            status: "paid",
            isTest: { $ne: true }, // ❌ בלי בדיקות
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const revenue =
      revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    /* ======================================================
       RESPONSE
    ====================================================== */
    return NextResponse.json({
      users,
      invitations,
      calls,
      revenue, // 💰 הכנסות נטו
    });
  } catch (err) {
    console.error("❌ Admin stats error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
