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

function uniqObjectIds(ids: string[]) {
  return Array.from(new Set(ids))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

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

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    const producerId =
      decoded.id || decoded._id || decoded.userId;

    if (!producerId) {
      return NextResponse.json(
        { success: false, message: "טוקן ללא מזהה משתמש" },
        { status: 401 }
      );
    }

    const producer: any = await User.findById(producerId).lean();
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
    const clientIdsRaw = Array.isArray(body?.clientIds)
      ? body.clientIds
      : [];

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return NextResponse.json(
        { success: false, message: "staffId לא תקין" },
        { status: 400 }
      );
    }

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

    if (
      producer.role === "producer" &&
      String(staff.assignedProducerId) !== String(producer._id)
    ) {
      return NextResponse.json(
        { success: false, message: "אין הרשאה לעדכן עובד זה" },
        { status: 403 }
      );
    }

    const clientIds = uniqObjectIds(
      clientIdsRaw.map((x: any) => String(x))
    );

    // ולידציה שהלקוחות קיימים (בלי createdByProducer)
const validClients = await User.find({
  _id: { $in: clientIds },
  role: "client",
})
  .select("_id")
  .lean();

const validClientIdSet = new Set(
  validClients.map((c: any) => String(c._id))
);

const filteredClientIds = clientIds.filter((id) =>
  validClientIdSet.has(String(id))
);

// ⬅️ זה מה שנשמר בפועל
staff.assignedClientIds = filteredClientIds;
await staff.save();


    return NextResponse.json({
      success: true,
      message: "ההקצאה נשמרה בהצלחה",
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        assignedClientIds: staff.assignedClientIds,
      },
    });
  } catch (error: any) {
    console.error("assign-clients error:", error);
    return NextResponse.json(
      { success: false, message: "שגיאת שרת" },
      { status: 500 }
    );
  }
}
