import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

/* ============================================================
   POST — יצירת מוזמן חדש
============================================================ */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: invitationId } = await context.params;

  try {
    await db();

    const {
      name,
      phone,
      relation,
      rsvp,
      guestsCount,
      tableNumber,
    } = await req.json();

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "Missing name or phone" },
        { status: 400 }
      );
    }

    // בדיקה אם כבר קיים מוזמן עם אותו מספר
    const existing = await InvitationGuest.findOne({ invitationId, phone });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Guest already exists", guest: existing },
        { status: 409 }
      );
    }

    const token = nanoid(12);

    // ✅ שמירת כל הערכים החדשים כולל relation ו־rsvp
    const guest = await InvitationGuest.create({
      invitationId,
      name,
      phone,
      relation: relation || "",
      rsvp: rsvp || "pending",
      guestsCount: guestsCount || 1,
      tableName: tableNumber ? `שולחן ${tableNumber}` : undefined,
      notes: "",
      token,
    });

    return NextResponse.json({ success: true, guest }, { status: 201 });
  } catch (err) {
    console.error("❌ POST error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

/* ============================================================
   GET — כל המוזמנים להזמנה
============================================================ */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: invitationId } = await context.params;

  try {
    await db();

    const guests = await InvitationGuest.find({ invitationId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, guests });
  } catch (err) {
    console.error("❌ GET error:", err);
    return NextResponse.json(
      { success: false, error: "Failed loading guests" },
      { status: 500 }
    );
  }
}

/* ============================================================
   PUT — עדכון מוזמן
============================================================ */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: invitationId } = await context.params;
  const { guestId, ...updates } = await req.json();

  try {
    await db();

    if (!guestId) {
      return NextResponse.json(
        { success: false, error: "Missing guestId" },
        { status: 400 }
      );
    }

    const updated = await InvitationGuest.findOneAndUpdate(
      { _id: guestId, invitationId },
      updates,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, guest: updated });
  } catch (err) {
    console.error("❌ PUT error:", err);
    return NextResponse.json(
      { success: false, error: "Update failed" },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE — מחיקת מוזמן
============================================================ */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: invitationId } = await context.params;
  const { guestId } = await req.json();

  try {
    await db();

    if (!guestId) {
      return NextResponse.json(
        { success: false, error: "Missing guestId" },
        { status: 400 }
      );
    }

    const deleted = await InvitationGuest.findOneAndDelete({
      _id: guestId,
      invitationId,
    });

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE error:", err);
    return NextResponse.json(
      { success: false, error: "Delete failed" },
      { status: 500 }
    );
  }
}
