import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   GET — מחזיר את ההזמנה של המשתמש (אם קיימת)
============================================================ */
export async function GET() {
  try {
    await db();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const invitation = await Invitation.findOne({
      ownerId: auth.userId,
    })
      .select(`
        title
        eventType
        eventDate
        eventTime
        location
        maxGuests
        maxMessages
        remainingMessages
        shareId
      `)
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "NO_INVITATION" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation,
    });
  } catch (err) {
    console.error("❌ Error loading my invitation:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST — יוצר הזמנה "טיוטה" למשתמש אם אין עדיין
============================================================ */
export async function POST(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    /* ===============================
       🧠 טעינת יוזר אמיתי מה־DB
    =============================== */
    const user = await User.findById(auth.userId).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ===============================
       אם כבר יש הזמנה — מחזירים אותה
    =============================== */
    const existing = await Invitation.findOne({
      ownerId: auth.userId,
    })
      .select(`
        title
        eventType
        eventDate
        eventTime
        location
        maxGuests
        maxMessages
        remainingMessages
        shareId
      `)
      .lean();

    if (existing) {
      return NextResponse.json({
        success: true,
        invitation: existing,
      });
    }

    /* ===============================
       📦 גוף הבקשה
    =============================== */
    const body = await req.json().catch(() => ({} as any));

    /* ===============================
       🧮 הגבלות מהיוזר האמיתי
    =============================== */
    const maxGuests = Number(user.guests) || 100;
    const maxMessages = Number(user.maxMessages) || 300;

    /* ===============================
       🧾 יצירת ההזמנה
    =============================== */
    const created = await Invitation.create({
      ownerId: auth.userId,
      title: body?.title || "הזמנה חדשה",
      eventType: body?.eventType || "",
      eventDate: body?.eventDate || null,
      eventTime: body?.eventTime || "",
      location: body?.location || {},

      guests: [],

      maxGuests,                 // ✅ כאן התיקון הקריטי
      maxMessages,
      remainingMessages: maxMessages,
      sentSmsCount: 0,
    });

    return NextResponse.json(
      {
        success: true,
        invitation: {
          _id: created._id,
          title: created.title,
          eventType: created.eventType,
          eventDate: created.eventDate,
          eventTime: created.eventTime,
          location: created.location,
          maxGuests: created.maxGuests,
          maxMessages: created.maxMessages,
          remainingMessages: created.remainingMessages,
          shareId: created.shareId,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error creating my invitation:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
