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

    /* =========================================================
       USERS – כל מי שיש לו גישה בתשלום (לא דמו)
       ========================================================= */
    const users = await User.find({
      isDemoUser: { $ne: true },
      $or: [
        { hasPaid: true },                    // שילם ישירות
        { plan: "premium" },                  // חבילת פרימיום פעילה
        { createdByProducer: { $ne: null } }, // נוצר ע״י מפיק ששילם
      ],
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
        hasPaid
        createdByProducer
      `)
      .sort({ createdAt: -1 })
      .lean();

    /* =========================================================
       TOTAL REVENUE – חישוב נכון
       ========================================================= */
    const revenueAgg = await User.aggregate([
      {
        $match: {
          isDemoUser: { $ne: true },
          $or: [
            { hasPaid: true },
            { plan: "premium" },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $ifNull: ["$paidAmount", 0] },
          },
        },
      },
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue ?? 0;

    /* ================= RESPONSE ================= */
    return NextResponse.json(
      {
        success: true,
        users,
        totalRevenue,
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
