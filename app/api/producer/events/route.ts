import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

type JwtPayload = {
  id: string;
  role?: string;
};

export async function GET(_req: NextRequest) {
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

    const currentUser: any = await User.findById(decoded.id).lean();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "משתמש לא נמצא" },
        { status: 404 }
      );
    }

    let query: Record<string, any> = {};

    // אדמין - הכל
    if (currentUser.role === "admin") {
      query = {};
    }

    // מפיק - רק האירועים שלו
    else if (currentUser.role === "producer") {
      query = { producerId: currentUser._id };
    }

    // צוות
    else if (currentUser.role === "staff") {
      // עובד כללי - הכל
      if (currentUser.staffType === "general_staff") {
        query = {};
      }

      // עובד מפיק - לפי משתמשים שהוקצו אליו (assignedClientIds)
      else if (currentUser.staffType === "producer_staff") {
        if (!currentUser.assignedProducerId) {
          return NextResponse.json(
            { success: false, message: "עובד מפיק ללא שיוך למפיק" },
            { status: 403 }
          );
        }

        const rawAssignedClients = Array.isArray(currentUser.assignedClientIds)
          ? currentUser.assignedClientIds
          : [];

        // מנקים IDs לא תקינים וממירים ל-ObjectId
        const assignedClientObjectIds = rawAssignedClients
          .map((id: any) => String(id))
          .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
          .map((id: string) => new mongoose.Types.ObjectId(id));

        // אם אין לקוחות מוקצים לעובד => אין אירועים
        if (assignedClientObjectIds.length === 0) {
          return NextResponse.json({ success: true, events: [] });
        }

        query = {
          producerId: currentUser.assignedProducerId,
          userId: { $in: assignedClientObjectIds },
        };
      } else {
        return NextResponse.json(
          { success: false, message: "סוג עובד לא תקין" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: "אין הרשאה" },
        { status: 403 }
      );
    }

    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error: any) {
    console.error("GET /api/producer/events error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "שגיאת שרת" },
      { status: 500 }
    );
  }
}
