import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// חשוב: טעינת מודל האורחים
import "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";

/* ============================================================
   📥 GET — שליפת הזמנה לפי מזהה
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

    const invitation = await Invitation.findById(id)
      .populate("guests")
      .lean();

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
   💾 PUT — עדכון הזמנה קיימת
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
    } = body;

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    /* ===== BASIC FIELDS ===== */

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

    /* ===== LOCATION ===== */

    if (
      location &&
      (
        (typeof location.address === "string" && location.address.trim()) ||
        location.lat !== undefined ||
        location.lng !== undefined
      )
    ) {
      updatePayload.location = {
        name: typeof location.name === "string" ? location.name.trim() : "",
        address:
          typeof location.address === "string"
            ? location.address.trim()
            : "",
        lat: typeof location.lat === "number" ? location.lat : null,
        lng: typeof location.lng === "number" ? location.lng : null,
      };
    }

    /* ===== CANVAS ===== */

    if (canvasData !== undefined) {
      updatePayload.canvasData = canvasData;
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
