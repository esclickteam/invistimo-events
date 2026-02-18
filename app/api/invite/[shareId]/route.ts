import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";

/* ============================================================
   Helpers
============================================================ */

function toBool(v: unknown) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function cleanStr(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeGiftOptions(raw: any) {
  const creditEnabled = toBool(raw?.creditEnabled);
  const payboxEnabled = toBool(raw?.payboxEnabled);

  const creditUrl = creditEnabled ? cleanStr(raw?.creditUrl) : "";
  const payboxUrl = payboxEnabled ? cleanStr(raw?.payboxUrl) : "";

  return {
    creditEnabled,
    creditUrl,
    payboxEnabled,
    payboxUrl,
  };
}

/* ============================================================
   GET — קבלת הזמנה לפי shareId
   אם מגיע token => מאתרים אורח לפי token + invitationId
   מחזירים invitation + event + guest (אם קיים)
   ❗️ GET בלבד — לא משנה נתונים
============================================================ */
export async function GET(
  req: Request,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    await db();

    const { shareId } = await context.params;

    if (!shareId || typeof shareId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid shareId" },
        { status: 400 }
      );
    }

    // token מה-URL: /invite/:shareId?token=...
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    /* ============================================================
       1) שליפת ההזמנה (בלי populate)
    ============================================================ */
    const invitation = await Invitation.findOne({ shareId }).lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    /* ============================================================
       ✅ נרמול giftOptions כדי שה-Frontend יקבל תמיד מבנה עקבי
    ============================================================ */
    const safeInvitation = {
      ...invitation,
      giftOptions: normalizeGiftOptions((invitation as any)?.giftOptions),
    };

    /* ============================================================
       2) שליפת האירוע (location האמיתי נמצא כאן)
    ============================================================ */
    const event = await Event.findById(invitation.eventId).lean();

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    /* ============================================================
       3) אימות אורח לפי token + invitationId (אם קיים token)
    ============================================================ */
    let guest: any = null;

    if (token) {
      const foundGuest = await InvitationGuest.findOne({
        token,
        invitationId: invitation._id,
      }).lean();

      if (!foundGuest) {
        return NextResponse.json(
          { success: false, error: "INVALID_TOKEN" },
          { status: 404 }
        );
      }

      // ✅ נרמול עקבי ל־Frontend:
      // arrivedCount תמיד קיים (לפני RSVP = 0)
      guest = {
        ...foundGuest,
        arrivedCount:
          typeof foundGuest.arrivedCount === "number"
            ? foundGuest.arrivedCount
            : 0,
      };
    }

    /* ============================================================
       Response
    ============================================================ */
    return NextResponse.json(
      {
        success: true,
        invitation: safeInvitation, // ✅ כולל giftOptions עקבי
        event, // כולל location עם lat/lng
        guest, // arrivedCount תמיד קיים
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error in GET /api/invite/[shareId]:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
