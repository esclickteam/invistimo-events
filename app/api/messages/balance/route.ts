import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();

  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const invitation = await Invitation.findOne({ ownerId: userId });

  if (!invitation) {
    return NextResponse.json({
      success: true,
      maxMessages: 0,
      remainingMessages: 0,
      sentSmsCount: 0,
    });
  }

  const maxMessages =
    typeof invitation.maxMessages === "number"
      ? invitation.maxMessages
      : 0;

  const remainingMessages =
    typeof invitation.remainingMessages === "number"
      ? invitation.remainingMessages
      : 0;

  const sentSmsCount =
    typeof invitation.sentSmsCount === "number"
      ? invitation.sentSmsCount
      : 0;

  return NextResponse.json({
    success: true,
    smsEnabled: maxMessages > 0,
    maxMessages,
    remainingMessages,
    sentSmsCount,
  });
}
