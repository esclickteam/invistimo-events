import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";

type JwtPayload = {
  id?: string;
  _id?: string;
  userId?: string;
  role?: string;
};

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    /* =========================
       Auth
    ========================= */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    } catch {
      return NextResponse.json(
        { success: false, message: "טוקן לא תקין" },
        { status: 401 }
      );
    }

    const staffId = decoded.id || decoded._id || decoded.userId;
    if (!staffId) {
      return NextResponse.json(
        { success: false, message: "זיהוי משתמש נכשל" },
        { status: 401 }
      );
    }

    const staff = await User.findById(staffId).lean();

    if (
      !staff ||
      staff.role !== "staff" ||
      staff.staffType !== "producer_staff"
    ) {
      return NextResponse.json(
        { success: false, message: "אין הרשאה" },
        { status: 403 }
      );
    }

    /* =========================
       Body
    ========================= */
    const { eventId } = await req.json();

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: "חסר eventId" },
        { status: 400 }
      );
    }

    /* =========================
       Event
    ========================= */
    const invitation = await Invitation.findById(eventId).lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, message: "אירוע לא נמצא" },
        { status: 404 }
      );
    }

    /* =========================
       Authorization
       staff → דרך assignedClientIds
    ========================= */
    const assignedClientIds = Array.isArray(staff.assignedClientIds)
      ? staff.assignedClientIds.map(String)
      : [];

    const ownerId = String(invitation.ownerId);

    if (!assignedClientIds.includes(ownerId)) {
      return NextResponse.json(
        { success: false, message: "אין הרשאה לאירוע זה" },
        { status: 403 }
      );
    }

    /* =========================
       Success
    ========================= */
    return NextResponse.json({
      success: true,
      eventId: String(invitation._id),
    });
  } catch (err) {
    console.error("❌ staff/manage-event error:", err);
    return NextResponse.json(
      { success: false, message: "שגיאת שרת" },
      { status: 500 }
    );
  }
}
