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
      .select("eventType eventDate maxGuests usedMessages shareId")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "NO_INVITATION" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        usedMessages: invitation.usedMessages || 0,
      },
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
   ✅ מיועד לזה שתוכלי להוסיף מוזמנים גם לפני יצירת הזמנה
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

    // אם כבר יש הזמנה — לא יוצרים עוד אחת (רק מחזירים אותה)
    const existing = await Invitation.findOne({ ownerId: userId })
      .select("eventType eventDate maxGuests usedMessages shareId")
      .lean();

    if (existing) {
      return NextResponse.json({
        success: true,
        invitation: {
          ...existing,
          usedMessages: existing.usedMessages || 0,
        },
      });
    }

    // אפשר לקבל ערכים מהפרונט אם תרצי, אבל גם ריק עובד
    const body = await req.json().catch(() => ({} as any));

    // יצירת טיוטה בסיסית
    // חשוב: shareId חייב להיווצר אצלך במודל (default) או כאן.
    const created = await Invitation.create({
      ownerId: userId,
      eventType: body?.eventType || "",
      eventDate: body?.eventDate || null,
      maxGuests: body?.maxGuests || 100,
      usedMessages: 0,
      // אם אין לך default ל-shareId במודל, תבטלי הערה ותייצרי פה:
      // shareId: nanoid(10),
    });

    return NextResponse.json(
      {
        success: true,
        invitation: {
          _id: created._id,
          eventType: created.eventType,
          eventDate: created.eventDate,
          maxGuests: created.maxGuests,
          usedMessages: created.usedMessages || 0,
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
