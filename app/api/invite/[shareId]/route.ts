import { NextResponse, after } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import Event from "@/models/Event";
import { recordGuestLinkOpen } from "@/lib/guestLinkTracking.server";
import { resolveAndPersistEventLocation } from "@/lib/persistEventMapPin";

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

function normalizePublicEventPage(raw: any) {
  const noteEnabled =
    raw?.note?.enabled === true ||
    raw?.noteEnabled === true ||
    raw?.showNote === true ||
    raw?.showGuestNote === true;

  const noteText =
    cleanStr(raw?.note?.text) ||
    cleanStr(raw?.noteText) ||
    cleanStr(raw?.guestNoteText) ||
    "";

  return {
    enabled: raw?.enabled !== false,

    gifts: {
      creditUrl: cleanStr(raw?.gifts?.creditUrl),
      payboxUrl: cleanStr(raw?.gifts?.payboxUrl),
      bitPhone: cleanStr(raw?.gifts?.bitPhone),
      bitUrl: cleanStr(raw?.gifts?.bitUrl),
    },

    parking: {
      enabled: raw?.parking?.enabled === true,
      name: cleanStr(raw?.parking?.name),
      address: cleanStr(raw?.parking?.address),
      lat:
        typeof raw?.parking?.lat === "number"
          ? raw.parking.lat
          : null,
      lng:
        typeof raw?.parking?.lng === "number"
          ? raw.parking.lng
          : null,
      instructions: cleanStr(raw?.parking?.instructions),
    },

    schedule: {
      enabled: raw?.schedule?.enabled === true,
      items: Array.isArray(raw?.schedule?.items)
        ? raw.schedule.items.map((item: any) => ({
            time: cleanStr(item?.time),
            title: cleanStr(item?.title),
            description: cleanStr(item?.description),
          }))
        : [],
    },

    coupleImage: {
      enabled: raw?.coupleImage?.enabled === true,
      url: cleanStr(raw?.coupleImage?.url),
      publicId: cleanStr(raw?.coupleImage?.publicId),
    },

    note: {
      enabled: noteEnabled,
      text: noteText,
    },

    // תאימות אחורה אם יש קוד ישן בפרונט
    noteEnabled,
    noteText,
  };
}

function isStaffPreviewRequest(req: Request) {
  const { searchParams } = new URL(req.url);

  const preview = cleanStr(searchParams.get("preview")).toLowerCase();
  const mode = cleanStr(searchParams.get("mode")).toLowerCase();
  const staffPreview = searchParams.get("staffPreview");

  return (
    preview === "staff" ||
    mode === "staff" ||
    toBool(staffPreview)
  );
}

/* ============================================================
   GET — קבלת הזמנה לפי shareId

   רגיל:
   /invite/[shareId]?token=GUEST_TOKEN
   מחזיר גם guest ומאפשר RSVP.

   צפייה לעובד:
   /invite/[shareId]?preview=staff
   מחזיר invitation + event בלבד, בלי guest,
   כדי שהעובד יראה את ההזמנה ולא יענה בשם אורח.
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

    const { searchParams } = new URL(req.url);
    const token = cleanStr(searchParams.get("token"));
    const isStaffPreview = isStaffPreviewRequest(req);

    /* ============================================================
       1) שליפת ההזמנה
    ============================================================ */
    const invitation = await Invitation.findOne({ shareId }).lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    /* ============================================================
       2) שליפת האירוע
    ============================================================ */
    const event = await Event.findById((invitation as any).eventId).lean();

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    /* ============================================================
       3) נרמול ההזמנה לעמוד הציבורי
    ============================================================ */
    const safeInvitation = {
      ...invitation,

      location: await resolveAndPersistEventLocation(invitation, event),

      giftOptions: normalizeGiftOptions((invitation as any)?.giftOptions),

      publicEventPage: normalizePublicEventPage(
        (invitation as any)?.publicEventPage
      ),
    };

    /* ============================================================
       4) אימות אורח לפי token + invitationId

       חשוב:
       במצב preview=staff לא מחפשים אורח ולא דורשים token.
       ככה העובד רואה את ההזמנה בלבד, בלי אפשרות לענות בשם אורח.
    ============================================================ */
    let guest: any = null;

    if (token && !isStaffPreview) {
      const foundGuest = await InvitationGuest.findOne({
        token,
        invitationId: (invitation as any)._id,
      }).lean();

      if (!foundGuest) {
        return NextResponse.json(
          { success: false, error: "INVALID_TOKEN" },
          { status: 404 }
        );
      }

      guest = {
        ...foundGuest,
        arrivedCount:
          typeof foundGuest.arrivedCount === "number"
            ? foundGuest.arrivedCount
            : 0,
      };

      try {
        after(() =>
          recordGuestLinkOpen({
            token,
            invitationId: (invitation as any)._id,
            userAgent: req.headers.get("user-agent"),
            isPreview: isStaffPreview,
            purpose:
              req.headers.get("sec-fetch-purpose") ||
              req.headers.get("purpose"),
          })
        );
      } catch {
        // tracking is best-effort and must never block the invite
      }
    }

    /* ============================================================
       Response
    ============================================================ */
    return NextResponse.json(
      {
        success: true,

        invitation: safeInvitation,
        event,

        // יהיה null במצב preview=staff
        guest,

        // חדש — כדי שהפרונט ידע שזה צפייה בלבד
        preview: {
          enabled: isStaffPreview,
          type: isStaffPreview ? "staff" : "",
        },

        isPreview: isStaffPreview,
        isStaffPreview,

        // כפתורי RSVP צריכים להיות פעילים רק כשיש אורח אמיתי עם token
        canSubmitRsvp: Boolean(guest && !isStaffPreview),
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