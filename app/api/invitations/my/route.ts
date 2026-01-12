import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Event from "@/models/Event";
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
        _id
        eventId
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
   POST — יוצר הזמנה למשתמש (חייב eventId)
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
       🧠 טעינת יוזר
    =============================== */
    const user = await User.findById(auth.userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ===============================
       📦 גוף הבקשה
    =============================== */
    const body = await req.json().catch(() => ({} as any));

    if (!body?.eventId) {
      return NextResponse.json(
        { success: false, error: "EVENT_ID_REQUIRED" },
        { status: 400 }
      );
    }

    /* ===============================
       🧠 וידוא שהאירוע שייך ליוזר
    =============================== */
    const event = await Event.findOne({
      _id: body.eventId,
      userId: auth.userId,
    }).lean();

    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ===============================
       אם כבר יש הזמנה — מחזירים אותה
    =============================== */
    const existing = await Invitation.findOne({
      ownerId: auth.userId,
      eventId: body.eventId,
    }).lean();

    if (existing) {
      return NextResponse.json({
        success: true,
        invitation: existing,
      });
    }

    /* ===============================
       🧮 מגבלות לפי היוזר
    =============================== */
    const maxGuests = Number(user.guests) || 100;
    const maxMessages = Number(user.maxMessages) || 300;

    /* ===============================
       🧾 יצירת הזמנה
    =============================== */
    const created = await Invitation.create({
      ownerId: auth.userId,
      eventId: body.eventId,

      guests: [],

      maxGuests,
      maxMessages,
      remainingMessages: maxMessages,
      sentSmsCount: 0,
    });

    return NextResponse.json(
      {
        success: true,
        invitation: {
          _id: created._id,
          eventId: created.eventId,
          maxGuests: created.maxGuests,
          maxMessages: created.maxMessages,
          remainingMessages: created.remainingMessages,
          shareId: created.shareId,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error creating invitation:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
