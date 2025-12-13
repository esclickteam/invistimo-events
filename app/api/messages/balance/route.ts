import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();

  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitation = await Invitation.findOne({ ownerId: userId });
  if (!invitation) {
    return NextResponse.json({ error: "INV_NOT_FOUND" }, { status: 404 });
  }

  const maxMessages = invitation.maxGuests * 3;
  const remainingMessages = Math.max(
    maxMessages - invitation.sentSmsCount,
    0
  );

  return NextResponse.json({
    success: true,
    maxMessages,
    sentSmsCount: invitation.sentSmsCount,
    remainingMessages,
  });
}
