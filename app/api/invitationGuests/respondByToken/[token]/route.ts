import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  await db();

  const { token } = params;
  const body = await req.json();

  const guest = await InvitationGuest.findOne({ token });

  if (!guest) {
    return NextResponse.json(
      { success: false, error: "Guest not found" },
      { status: 404 }
    );
  }

  guest.rsvp = body.rsvp;
  guest.guestsCount = body.guestsCount || guest.guestsCount;
  guest.notes = body.notes || "";

  await guest.save();

  return NextResponse.json({ success: true, guest });
}
