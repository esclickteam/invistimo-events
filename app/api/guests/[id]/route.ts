import { NextResponse, NextRequest } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db();

    const { id: invitationId } = params;
    const { name, phone } = await req.json();

    if (!invitationId) {
      return NextResponse.json(
        { error: "Missing invitation id" },
        { status: 400 }
      );
    }

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Missing guest name or phone" },
        { status: 400 }
      );
    }

    // מניעת כפילות
    const existingGuest = await InvitationGuest.findOne({
      phone,
      invitationId,
    });

    if (existingGuest) {
      return NextResponse.json(
        {
          error: "Guest already exists for this event",
          guest: existingGuest,
        },
        { status: 409 }
      );
    }

    // token ייחודי
    const token = nanoid(12);

    const guest = await InvitationGuest.create({
      name,
      phone,
      invitationId,
      token,
      rsvp: "pending",
      guestsCount: 1,
      notes: "",
    });

    return NextResponse.json({ success: true, guest }, { status: 201 });

  } catch (err) {
    console.error("❌ Error POST /api/invitations/[id]/guests:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
