import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   GET — מחזיר את ההזמנה של המשתמש (אם קיימת)
============================================================ */
export async function GET() {
  try {
    await db();

    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const invitation = await Invitation.findOne({ ownerId: userId })
      .select(
        `
        title
        eventType
        eventDate
        eventTime
        location
        maxGuests
        maxMessages
        remainingMessages
        shareId
        `
      )
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

    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // אם כבר יש הזמנה — מחזירים אותה
    const existing = await Invitation.findOne({ ownerId: userId })
      .select(
        `
        title
        eventType
        eventDate
        eventTime
        location
        maxGuests
        maxMessages
        remainingMessages
        shareId
        `
      )
      .lean();

    if (existing) {
      return NextResponse.json({
        success: true,
        invitation: existing,
      });
    }

    const body = await req.json().catch(() => ({} as any));

    const created = await Invitation.create({
      ownerId: userId,
      title: body?.title || "הזמנה חדשה",
      eventType: body?.eventType || "",
      eventDate: body?.eventDate || null,
      eventTime: body?.eventTime || "",
      location: body?.location || {},
      maxGuests: body?.maxGuests || 100,
      // maxMessages / remainingMessages מחושבים אוטומטית מהמודל
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
