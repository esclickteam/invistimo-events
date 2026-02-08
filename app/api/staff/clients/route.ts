import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event"; // אם יש מודל נפרד

export const dynamic = "force-dynamic";

type JwtPayload = {
  id?: string;
  _id?: string;
  userId?: string;
  role?: string;
};

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    /* ===============================
       Auth
    =============================== */
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
    ) as JwtPayload;

    const staffId =
      decoded.id || decoded._id || decoded.userId;

    if (!staffId || !mongoose.Types.ObjectId.isValid(staffId)) {
      return NextResponse.json(
        { success: false, message: "טוקן לא תקין" },
        { status: 401 }
      );
    }

    /* ===============================
       Load staff
    =============================== */
    const staff: any = await User.findById(staffId).lean();

    if (!staff) {
      return NextResponse.json(
        { success: false, message: "משתמש לא נמצא" },
        { status: 404 }
      );
    }

    if (
      staff.role !== "staff" ||
      staff.staffType !== "producer_staff"
    ) {
      return NextResponse.json(
        { success: false, message: "אין הרשאה" },
        { status: 403 }
      );
    }

    const assignedClientIds: string[] = Array.isArray(
      staff.assignedClientIds
    )
      ? staff.assignedClientIds
          .map((id: any) => String(id))
          .filter((id: string) =>
            mongoose.Types.ObjectId.isValid(id)
          )
      : [];

    if (assignedClientIds.length === 0) {
      return NextResponse.json({
        success: true,
        clients: [],
      });
    }

    /* ===============================
       Load clients + events
    =============================== */
    const clients = await User.find({
      _id: { $in: assignedClientIds },
      role: "client",
    })
      .select("name email phone event")
      .populate({
        path: "event",
        select:
          "title date location totalGuests approvedCount",
      })
      .lean();

    return NextResponse.json({
      success: true,
      clients,
    });
  } catch (error: any) {
    console.error("staff/clients error:", error);
    return NextResponse.json(
      { success: false, message: "שגיאת שרת" },
      { status: 500 }
    );
  }
}
