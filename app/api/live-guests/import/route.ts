import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(req: Request) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const invitationId = searchParams.get("invitationId");

  if (!invitationId) {
    return NextResponse.json(
      { success: false, error: "Missing invitationId" },
      { status: 400 }
    );
  }

  const guests = await InvitationGuest.find({
    invitationId,
  }).lean();

  const stats = {
    total: guests.reduce((s, g) => s + (g.guestsCount || 0), 0),
    arrived: guests.reduce((s, g) => s + (g.arrivedCount || 0), 0),
    notArrived: guests.filter((g) => g.rsvp === "no").length,
    cancelled: guests.filter((g) => g.rsvp === "cancelled").length,
  };

  return NextResponse.json({
    success: true,
    guests,
    stats,
  });
}
