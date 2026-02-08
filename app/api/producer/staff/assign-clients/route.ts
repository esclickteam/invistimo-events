import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

type JwtPayload = {
  id: string;
  role?: string;
};

function uniqObjectIds(ids: string[]) {
  return Array.from(new Set(ids))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

/**
 * PATCH /api/producer/staff/assign-clients
 *
 * body:
 * {
 *   staffId: string,
 *   clientIds: string[]
 * }
 *
 * פעולה:
 * - רק מפיק יכול לבצע
 * - מעדכן לעובד מפיק את assignedClientIds
 * - מאפשר "לקוח X מוקצה לעובדים Y,Z" (כל עובד מחזיק רשימה משלו)
 */
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const producer: any = await User.findById(decoded.id).lean();
    if (!producer) {
      return NextResponse.json(
        { success: false, message: "משתמש לא נמצא" },
        { status: 404 }
      );
    }

    if (producer.role !== "producer" && producer.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "אין הרשאה" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const staffId = String(body?.staffId || "");
    const clientIdsRaw = Array.isArray(body?.clientIds) ? body.clientIds : [];

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return NextResponse.json(
        { success: false, message: "staffId לא תקין" },
        { status: 400 }
      );
    }

    // worker target
    const staff: any = await User.findById(staffId);
    if (!staff) {
      return NextResponse.json(
        { success: false, message: "העובד לא נמצא" },
        { status: 404 }
      );
    }

    if (staff.role !== "staff" || staff.staffType !== "producer_staff") {
      return NextResponse.json(
        { success: false, message: "ניתן להקצות לקוחות רק לעובד מפיק" },
        { status: 400 }
      );
    }

    // אם מפיק (לא אדמין) - חייב להיות בעלים של העובד
    if (
      producer.role === "producer" &&
      String(staff.assignedProducerId || "") !== String(producer._id)
    ) {
      return NextResponse.json(
        { success: false, message: "אין הרשאה לעדכן עובד זה" },
        { status: 403 }
      );
    }

    const clientIds = uniqObjectIds(clientIdsRaw.map((x: any) => String(x)));

    // ולידציה שהלקוחות קיימים והם לקוחות של אותו מפיק
    // אדמין יכול לעדכן גם בלי הבדיקה הזאת אם תרצי; כרגע נשמור עקביות מלאה
    const validClients = await User.find({
      _id: { $in: clientIds },
      role: "client",
      createdByProducer: staff.assignedProducerId,
    })
      .select("_id")
      .lean();

    const validClientIdSet = new Set(validClients.map((c: any) => String(c._id)));
    const filteredClientIds = clientIds.filter((id) =>
      validClientIdSet.has(String(id))
    );

    staff.assignedClientIds = filteredClientIds;
    await staff.save();

    return NextResponse.json({
      success: true,
      message: "ההקצאה נשמרה בהצלחה",
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        staffType: staff.staffType,
        assignedProducerId: staff.assignedProducerId,
        assignedClientIds: staff.assignedClientIds,
      },
      ignoredClientIds: clientIds
        .map((id) => String(id))
        .filter((id) => !validClientIdSet.has(id)), // שקיפות למה לא נשמר
    });
  } catch (error: any) {
    console.error("PATCH /api/producer/staff/assign-clients error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "שגיאת שרת" },
      { status: 500 }
    );
  }
}
