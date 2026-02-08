import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();

    // ✅ חובה בפרויקט שלך: cookies() מחזיר Promise
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      role: string;
    };

    if (decoded.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "אין הרשאה" },
        { status: 403 }
      );
    }

    const staff = await User.find({
      role: "staff",
      staffType: "producer_staff",
      assignedProducerId: decoded.id,
    })
      .select("_id name email assignedClientIds")
      .lean();

    return NextResponse.json({ success: true, staff });
  } catch (err: any) {
    console.error("staff list error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "שגיאת שרת" },
      { status: 500 }
    );
  }
}
