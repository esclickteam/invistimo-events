import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";

import User from "@/models/User";
import Invitation from "@/models/Invitation";
import Payment from "@/models/Payment";

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
       COUNTS
    ====================================================== */
    const [
      usersCount,
      invitationsCount,
      callsCount,
      revenueAgg,
      refundsAgg,
    ] = await Promise.all([
      // 👤 משתמשים
      User.countDocuments(),

      // ✉️ הזמנות
      Invitation.countDocuments(),

      // ☎️ שירותי שיחות פעילים
      User.countDocuments({ includeCalls: true }),

      // 💰 הכנסות נטו (כולל partial refunds)
      Payment.aggregate([
        {
          $match: {
            status: { $in: ["paid", "partially_refunded"] },
            isTest: { $ne: true },
          },
        },
        {
          $project: {
            netAmount: {
              $subtract: ["$amount", { $ifNull: ["$refundAmount", 0] }],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$netAmount" },
          },
        },
      ]),

      // 🔻 סה״כ זיכויים (מידע משלים לאדמין)
      Payment.aggregate([
        {
          $match: {
            status: { $in: ["refunded", "partially_refunded"] },
            isTest: { $ne: true },
          },
        },
        {
          $group: {
            _id: null,
            totalRefunds: { $sum: "$refundAmount" },
          },
        },
      ]),
    ]);

    const revenue =
      revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    const refunds =
      refundsAgg.length > 0 ? refundsAgg[0].totalRefunds : 0;

    /* ======================================================
       RESPONSE
    ====================================================== */
    return NextResponse.json(
      {
        users: usersCount,
        invitations: invitationsCount,
        calls: callsCount,

        revenue, // 💰 הכנסות נטו
        refunds, // 🔻 סה״כ זיכויים (אופציונלי להצגה)
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
