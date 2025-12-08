import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ======================================================
   סוג חדש שנדרש לגרסאות Next.js 16+
   params הוא Promise<{ id: string }>
====================================================== */
type RouteContext = {
  params: Promise<{ id: string }>;
};

/* ======================================================
   GET — שליפת אורח
====================================================== */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params; // ✅ חובה await בגלל שזה Promise

  try {
    await db();
    const guest = await InvitationGuest.findById(id);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, guest });
  } catch (err) {
    console.error("GET /guests/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ======================================================
   PUT — עדכון אורח
====================================================== */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    await db();
    const data = await req.json();

    const guest = await InvitationGuest.findById(id);
    if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });

    const invitation = await Invitation.findById(guest.invitationId);
    if (!invitation)
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

    const userId = await getUserIdFromRequest();
    if (!userId || userId.toString() !== invitation.ownerId.toString()) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    guest.name = data.name ?? guest.name;
    guest.phone = data.phone ?? guest.phone;
    guest.rsvp = data.rsvp ?? guest.rsvp;
    guest.guestsCount = data.guestsCount ?? guest.guestsCount;
    guest.notes = data.notes ?? guest.notes;

    await guest.save();
    return NextResponse.json({ success: true, guest });
  } catch (err) {
    console.error("PUT /guests/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ======================================================
   DELETE — מחיקת אורח
====================================================== */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    await db();

    const guest = await InvitationGuest.findById(id);
    if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });

    const invitation = await Invitation.findById(guest.invitationId);
    if (!invitation)
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

    const userId = await getUserIdFromRequest();
    if (!userId || userId.toString() !== invitation.ownerId.toString()) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await guest.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /guests/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
