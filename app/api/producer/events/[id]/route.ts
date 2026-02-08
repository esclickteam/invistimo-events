import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";

type JwtPayload = {
  id: string;
  role?: string;
};

function toObjectIdSet(ids: any[]): Set<string> {
  if (!Array.isArray(ids)) return new Set<string>();
  return new Set(
    ids
      .map((id) => String(id))
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
  );
}

function isSameId(a: any, b: any) {
  return String(a) === String(b);
}

/** הרשאת גישה לאירוע בודד */
function canAccessEvent(currentUser: any, event: any): boolean {
  // אדמין - הכל
  if (currentUser.role === "admin") return true;

  // מפיק - רק אירועים שלו
  if (currentUser.role === "producer") {
    return isSameId(event.producerId, currentUser._id);
  }

  // צוות
  if (currentUser.role === "staff") {
    // עובד כללי - הכל
    if (currentUser.staffType === "general_staff") return true;

    // עובד מפיק - רק אירוע של המפיק שלו + userId מוקצה אליו
    if (currentUser.staffType === "producer_staff") {
      if (!currentUser.assignedProducerId) return false;
      if (!isSameId(event.producerId, currentUser.assignedProducerId)) return false;

      const assignedClientIdsSet = toObjectIdSet(currentUser.assignedClientIds || []);
      return assignedClientIdsSet.has(String(event.userId));
    }

    return false;
  }

  return false;
}

/** אפשרות עריכה */
function canEditEvent(currentUser: any, event: any): boolean {
  // אדמין כן
  if (currentUser.role === "admin") return true;

  // מפיק רק שלו
  if (currentUser.role === "producer") {
    return isSameId(event.producerId, currentUser._id);
  }

  // צוות כללי - כן (אם את רוצה להגביל, שנה כאן ל-false)
  if (currentUser.role === "staff" && currentUser.staffType === "general_staff") {
    return true;
  }

  // עובד מפיק - רק אם יש גישה לאירוע
  if (currentUser.role === "staff" && currentUser.staffType === "producer_staff") {
    return canAccessEvent(currentUser, event);
  }

  return false;
}

/** שדות שאסור לצוות לשנות */
function sanitizePatchByRole(currentUser: any, patch: Record<string, any>) {
  const blockedForStaff = new Set([
    "producerId",
    "userId",
    "email",
    "paymentStatus",
    "stripeSessionId",
    "stripePriceId",
    "maxGuests",
    "assignedStaffIds",
  ]);

  // צוות (גם כללי וגם מפיק) לא יכול לשנות שדות מערכת רגישים
  if (currentUser.role === "staff") {
    for (const key of Object.keys(patch)) {
      if (blockedForStaff.has(key)) {
        delete patch[key];
      }
    }
  }

  return patch;
}

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    return { error: NextResponse.json({ success: false, message: "לא מחובר" }, { status: 401 }) };
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    return { error: NextResponse.json({ success: false, message: "טוקן לא תקין" }, { status: 401 }) };
  }

  const currentUser: any = await User.findById(decoded.id).lean();
  if (!currentUser) {
    return { error: NextResponse.json({ success: false, message: "משתמש לא נמצא" }, { status: 404 }) };
  }

  return { currentUser };
}

/* =========================
   GET /api/producer/events/[id]
========================= */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { currentUser, error } = await getCurrentUser();
    if (error) return error;

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "מזהה אירוע לא תקין" }, { status: 400 });
    }

    const event: any = await Event.findById(id).lean();
    if (!event) {
      return NextResponse.json({ success: false, message: "אירוע לא נמצא" }, { status: 404 });
    }

    if (!canAccessEvent(currentUser, event)) {
      return NextResponse.json({ success: false, message: "אין הרשאה לאירוע זה" }, { status: 403 });
    }

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error("GET /api/producer/events/[id] error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "שגיאת שרת" },
      { status: 500 }
    );
  }
}

/* =========================
   PATCH /api/producer/events/[id]
========================= */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { currentUser, error } = await getCurrentUser();
    if (error) return error;

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "מזהה אירוע לא תקין" }, { status: 400 });
    }

    const existingEvent: any = await Event.findById(id);
    if (!existingEvent) {
      return NextResponse.json({ success: false, message: "אירוע לא נמצא" }, { status: 404 });
    }

    if (!canEditEvent(currentUser, existingEvent)) {
      return NextResponse.json({ success: false, message: "אין הרשאה לערוך אירוע זה" }, { status: 403 });
    }

    const body = await req.json();
    const patch = sanitizePatchByRole(currentUser, { ...body });

    // הגנה נוספת - לא לאפשר החלפת מזהים גם אם נשלח nested
    delete patch._id;
    delete patch.id;

    const updated = await Event.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true }
    ).lean();

    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    console.error("PATCH /api/producer/events/[id] error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "שגיאת שרת" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE /api/producer/events/[id]
========================= */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { currentUser, error } = await getCurrentUser();
    if (error) return error;

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "מזהה אירוע לא תקין" }, { status: 400 });
    }

    const event: any = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ success: false, message: "אירוע לא נמצא" }, { status: 404 });
    }

    // מחיקה: אדמין/מפיק בלבד (אם את רוצה שגם general_staff - תשני כאן)
    const canDelete =
      currentUser.role === "admin" ||
      (currentUser.role === "producer" && isSameId(event.producerId, currentUser._id));

    if (!canDelete) {
      return NextResponse.json({ success: false, message: "אין הרשאה למחוק אירוע זה" }, { status: 403 });
    }

    await Event.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "האירוע נמחק בהצלחה" });
  } catch (error: any) {
    console.error("DELETE /api/producer/events/[id] error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "שגיאת שרת" },
      { status: 500 }
    );
  }
}
