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
   GET
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
        { success: false, error: "INVALID_SHARE_ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    /* ============================================================
       1) Invitation
    ============================================================ */

    const invitation = await Invitation.findOne({ shareId }).lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const safeInvitation = {
      ...invitation,
      giftOptions: normalizeGiftOptions(
        (invitation as any)?.giftOptions
      ),
    };

    /* ============================================================
       2) Event
    ============================================================ */

    const event = await Event.findById(invitation.eventId).lean();

    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ============================================================
       3) Guest validation (optional)
    ============================================================ */

    let guest = null;

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

      guest = {
        _id: foundGuest._id,
        token: foundGuest.token, // ✅ מבטיח שהטוקן חוזר
        name: foundGuest.name,
        phone: foundGuest.phone,
        rsvp: foundGuest.rsvp || "pending",
        arrivedCount:
          typeof foundGuest.arrivedCount === "number"
            ? foundGuest.arrivedCount
            : 0,
        notes: foundGuest.notes || [],
      };
    }

    /* ============================================================
       Response
    ============================================================ */

    return NextResponse.json(
      {
        success: true,
        invitation: safeInvitation,
        event,
        guest, // יהיה null אם אין token
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ GET /api/invite error:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
