import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

// טיפוס גמיש ל־Next.js (תומך גם ב-Promise)
type ParamsType = { id: string } | Promise<{ id: string }>;

/* ============================================
   GET — שליפת אורח יחיד
============================================ */
export async function GET(
  req: Request,
  context: { params: ParamsType }
) {
  await db();

  const params = await context.params; // ⭐ קריטי — תומך גם ב-Promise!
  const guestId = params.id;

  const guest = await InvitationGuest.findById(guestId);
  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, guest });
}

/* ============================================
   PUT — עדכון אורח
============================================ */
export async function PUT(
  req: Request,
  context: { params: ParamsType }
) {
  await db();

  const params = await context.params;
  const guestId = params.id;

  const data = await req.json();

  const guest = await InvitationGuest.findById(guestId);
  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const invitation = await Invitation.findById(guest.invitationId);
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const userId = await getUserIdFromRequest();
  if (!userId || userId.toString() !== invitation.ownerId.toString()) {
    return NextResponse.json(
      { error: "Not authorized" },
      { status: 403 }
    );
  }

  guest.name = data.name ?? guest.name;
  guest.phone = data.phone ?? guest.phone;
  guest.rsvp = data.rsvp ?? guest.rsvp;
  guest.guestsCount = data.guestsCount ?? guest.guestsCount;
  guest.notes = data.notes ?? guest.notes;

  await guest.save();

  return NextResponse.json({ success: true, guest });
}

/* ============================================
   DELETE — מחיקת אורח
============================================ */
export async function DELETE(
  req: Request,
  context: { params: ParamsType }
) {
  await db();

  const params = await context.params;
  const guestId = params.id;

  const guest = await InvitationGuest.findById(guestId);
  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const invitation = await Invitation.findById(guest.invitationId);
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const userId = await getUserIdFromRequest();
  if (!userId || userId.toString() !== invitation.ownerId.toString()) {
    return NextResponse.json(
      { error: "Not authorized" },
      { status: 403 }
    );
  }

  await guest.deleteOne();
  return NextResponse.json({ success: true });
}
