import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Payment from "@/models/Payment";

export const dynamic = "force-dynamic"; // 🔥 חובה

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

    /* ================= PAYMENTS = SOURCE OF TRUTH ================= */
    const paidPayments = await Payment.find({
      status: "paid",
      isTest: false,
    })
      .select("email createdAt amount priceKey maxGuests includeCalls includeCreditGifts")
      .sort({ createdAt: -1 })
      .lean();

    const paidEmails = paidPayments.map(p => p.email);

    if (paidEmails.length === 0) {
      return NextResponse.json({ success: true, users: [] });
    }

    /* ================= USERS ================= */
    const users = await User.find({
      email: { $in: paidEmails },
      isDemoUser: { $ne: true },
    })
      .select("email name role plan guests paidAmount includeCalls includeCreditGifts createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        users,
        payments: paidPayments, // 👈 אופציונלי – שימושי לאדמין
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