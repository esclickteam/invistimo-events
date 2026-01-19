import connectDB from "@/lib/mongodb";
import InvitationGuest from "@/models/InvitationGuest";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  await connectDB();

  const { invitationGuestId, arrivedCount } = await req.json();

  if (!invitationGuestId) {
    return NextResponse.json(
      { error: "invitationGuestId is required" },
      { status: 400 }
    );
  }

  const guest = await InvitationGuest.findById(invitationGuestId);
  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const safeArrived = Math.max(
    0,
    Math.min(Number(arrivedCount || 0), guest.guestsCount)
  );

  guest.arrivedCount = safeArrived;
  await guest.save();

  return NextResponse.json({
    success: true,
    invitationGuestId,
    arrivedCount: guest.arrivedCount,
  });
}
