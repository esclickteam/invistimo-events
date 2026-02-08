import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

type JwtPayload = {
  id?: string;
  _id?: string;
  userId?: string;
  role?: string;
};

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const producerId = decoded.id || decoded._id || decoded.userId;
    if (!producerId) {
      return NextResponse.json(
        { success: false, message: "טוקן לא תקין" },
        { status: 401 }
      );
    }

    const producer: any = await User.findById(producerId);
    if (!producer || producer.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "אין הרשאה" },
        { status: 403 }
      );
    }

    /* ================= BODY ================= */
    const body = await req.json();
    const staffId = String(body.staffId || "");
    const clientId = String(body.clientId || "");
    const action = body.action;

    if (
      !mongoose.Types.ObjectId.isValid(staffId) ||
      !mongoose.Types.ObjectId.isValid(clientId)
    ) {
      return NextResponse.json(
        { success: false, message: "ID לא תקין" },
        { status: 400 }
      );
    }

    if (action !== "add" && action !== "remove") {
      return NextResponse.json(
        { success: false, message: "פעולה לא חוקית" },
        { status: 400 }
      );
    }

    /* ================= STAFF ================= */
    const staff: any = await User.findById(staffId);
    if (!staff || staff.role !== "staff" || staff.staffType !== "producer_staff") {
      return NextResponse.json(
        { success: false, message: "עובד לא תקין" },
        { status: 404 }
      );
    }

    if (String(staff.assignedProducerId) !== String(producer._id)) {
      return NextResponse.json(
        { success: false, message: "אין הרשאה לעובד זה" },
        { status: 403 }
      );
    }

    /* ================= UPDATE ================= */
    const currentIds: string[] = Array.isArray(staff.assignedClientIds)
      ? staff.assignedClientIds.map((id: any) => String(id))
      : [];

    let nextIds: string[];

    if (action === "add") {
      nextIds = Array.from(new Set([...currentIds, clientId]));
    } else {
      nextIds = currentIds.filter((id) => id !== clientId);
    }

    staff.assignedClientIds = nextIds;
    await staff.save();

    /* ================= RESPONSE ================= */
    return NextResponse.json({
      success: true,
      assignedClientIds: nextIds,
    });
  } catch (err: any) {
    console.error("assign-clients error:", err);
    return NextResponse.json(
      { success: false, message: "שגיאת שרת" },
      { status: 500 }
    );
  }
}
