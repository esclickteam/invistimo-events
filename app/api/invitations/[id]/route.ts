import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

import "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";

/* ============================================================
   Helpers
============================================================ */

function isNonEmptyString(v: unknown) {
  return typeof v === "string" && v.trim().length > 0;
}

function toBool(v: unknown) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function cleanUrl(v: unknown) {
  if (typeof v !== "string") return "";
  return v.trim();
}

function normalizeGiftOptions(input: any) {
  const creditEnabled = toBool(input?.creditEnabled);
  const payboxEnabled = toBool(input?.payboxEnabled);

  const creditUrl = creditEnabled ? cleanUrl(input?.creditUrl) : "";
  const payboxUrl = payboxEnabled ? cleanUrl(input?.payboxUrl) : "";

  return {
    creditEnabled,
    creditUrl,
    payboxEnabled,
    payboxUrl,
  };
}

/* ============================================================
   📥 GET — שליפת הזמנה לפי מזהה
============================================================ */
/* ============================================================
   📥 GET — שליפת הזמנה לפי invitationId או eventId
============================================================ */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    // 🔥 חיפוש חכם: קודם לפי _id, אם לא נמצא — לפי eventId
    let invitation =
      (await Invitation.findById(id).populate("guests").lean()) ||
      (await Invitation.findOne({ eventId: id })
        .populate("guests")
        .lean());

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation,
    });
  } catch (err) {
    console.error("❌ Error in GET /api/invitations/[id]:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}


/* ============================================================
   💾 PUT — עדכון הזמנה קיימת (עדכון כללי)
============================================================ */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const body = await request.json();

   const {
  title,
  eventType,
  eventDate,
  eventTime,
  canvasData,
  location,
  orientation,
  designMode,
  inviteImageUrl,
} = body;

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (typeof title === "string" && title.trim()) {
      updatePayload.title = title.trim();
    }

    if (typeof eventType === "string" && eventType.trim()) {
      updatePayload.eventType = eventType.trim();
    }

    if (eventDate) {
      updatePayload.eventDate = new Date(eventDate);
    }

    if (typeof eventTime === "string" && eventTime.trim()) {
      updatePayload.eventTime = eventTime;
    }

    if (orientation === "portrait" || orientation === "landscape") {
  updatePayload.orientation = orientation;
}

    if (
      location &&
      ((typeof location.address === "string" && location.address.trim()) ||
        location.lat !== undefined ||
        location.lng !== undefined)
    ) {
      updatePayload.location = {
        name: typeof location.name === "string" ? location.name.trim() : "",
        address:
          typeof location.address === "string" ? location.address.trim() : "",
        lat: typeof location.lat === "number" ? location.lat : null,
        lng: typeof location.lng === "number" ? location.lng : null,
      };
    }

    if (canvasData !== undefined) {
      updatePayload.canvasData = canvasData;
    }

    /* ================= DESIGN MODE ================= */

if (designMode === "image") {
  updatePayload.designMode = "image";

  if (typeof inviteImageUrl === "string" && inviteImageUrl.trim()) {
    updatePayload.inviteImageUrl = inviteImageUrl.trim();
  }

  // אופציונלי: מנקה קנבס כדי שלא יחזור
  updatePayload.canvasData = undefined;
}

if (designMode === "canvas") {
  updatePayload.designMode = "canvas";
  updatePayload.inviteImageUrl = undefined;
}

    const updated = await Invitation.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true }
    )
      .populate("guests")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: updated,
    });
  } catch (err) {
    console.error("❌ Error in PUT /api/invitations/[id]:", err);
    return NextResponse.json(
      { success: false, error: "Server error while updating" },
      { status: 500 }
    );
  }
}


/* ============================================================
   🩹 PATCH — עדכון חלקי (giftOptions וכו')
   נדרש בשביל הצ׳קבוקסים והלינקים
============================================================ */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    /* ================= GIFT OPTIONS ================= */

    if (body?.giftOptions !== undefined) {
      updatePayload.giftOptions = normalizeGiftOptions(body.giftOptions);
    }

    /* ================= INVITATION SETTINGS ================= */

    if (body?.invitationSettings !== undefined) {
      updatePayload.invitationSettings = body.invitationSettings;
    }
/* ================= DESIGN MODE ================= */

if (body?.designMode === "image") {
  updatePayload.designMode = "image";

  if (typeof body.inviteImageUrl === "string") {
    updatePayload.inviteImageUrl = body.inviteImageUrl.trim();
  }
}

if (body?.designMode === "canvas") {
  updatePayload.designMode = "canvas";
}
    /* אם לא הגיע שום דבר לעדכון */
    if (Object.keys(updatePayload).length === 1) {
      return NextResponse.json(
        { success: false, error: "NO_FIELDS_TO_UPDATE" },
        { status: 400 }
      );
    }

    const updated = await Invitation.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true }
    )
      .populate("guests")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: updated,
    });
  } catch (err) {
    console.error("❌ Error in PATCH /api/invitations/[id]:", err);
    return NextResponse.json(
      { success: false, error: "Server error while patching" },
      { status: 500 }
    );
  }
}
