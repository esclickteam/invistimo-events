// ✅ app/api/guests/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================
   טיפוס לקונטקסט עם params
============================================ */
interface RouteContext {
  params: { id: string };
}

/* ============================================
   GET — שליפת אורח יחיד
============================================ */
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await db();
    const guestId = context.params.id;
    const guest = await InvitationGuest.findById(guestId);

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error("GET /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================================
   PUT — עדכון אורח
============================================ */
export async function PUT(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await db();
    const guestId = context.params.id;
    const data = await req.json();

    const guest = await InvitationGuest.findById(guestId);
    if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });

    const invitation = await Invitation.findById(guest.invitationId);
    if (!invitation)
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

    const userId = await getUserIdFromRequest();
    if (!userId || userId.toString() !== invitation.ownerId.toString()) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    Object.assign(guest, {
      name: data.name ?? guest.name,
      phone: data.phone ?? guest.phone,
      rsvp: data.rsvp ?? guest.rsvp,
      guestsCount: data.guestsCount ?? guest.guestsCount,
      notes: data.notes ?? guest.notes,
    });

    await guest.save();
    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error("PUT /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================================
   DELETE — מחיקת אורח
============================================ */
export async function DELETE(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await db();
    const guestId = context.params.id;

    const guest = await InvitationGuest.findById(guestId);
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
  } catch (error) {
    console.error("DELETE /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================================
   ❗ הוספת שורה קריטית לעקוף את הבאג
============================================ */
export const runtime = "nodejs";
