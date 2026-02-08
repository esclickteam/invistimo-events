import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

type JwtPayloadLike = {
  id?: string;
  _id?: string;
  userId?: string;
  role?: "producer" | "admin" | "staff" | "client";
};

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();

    // ✅ בפרויקט שלך cookies() הוא Promise
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayloadLike;

    if (decoded.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "אין הרשאה" },
        { status: 403 }
      );
    }

    // ✅ מזהה מפיק – תומך בכל וריאנט אפשרי
    const producerId =
      decoded.id || decoded._id || decoded.userId;

    if (!producerId) {
      return NextResponse.json(
        { success: false, message: "מזהה מפיק לא תקין" },
        { status: 401 }
      );
    }

    // 🔒 שכבת אבטחה: לוודא שהמפיק קיים
    const producerExists = await User.exists({
      _id: producerId,
      role: "producer",
    });

    if (!producerExists) {
      return NextResponse.json(
        { success: false, message: "מפיק לא נמצא" },
        { status: 404 }
      );
    }

    const staff = await User.find({
      role: "staff",
      staffType: "producer_staff",
      assignedProducerId: producerId,
    })
      .select("_id name email assignedClientIds")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      staff,
    });
  } catch (err: any) {
    console.error("staff list error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "שגיאת שרת" },
      { status: 500 }
    );
  }
}
