import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);

    const invitationId = searchParams.get("invitationId");
    const round = searchParams.get("round");

    if (!invitationId) {
      return NextResponse.json(
        { error: "Missing invitationId" },
        { status: 400 }
      );
    }

    const templateName =
      Number(round) === 1
        ? "rsvp_invitation_media"
        : "rsvp_reminder_invistimo";

    const schedule = await WhatsappQueue.findOne({
      invitationId,
      templateName,
      status: { $in: ["scheduled", "sending"] },
    }).lean();

    return NextResponse.json({
      success: true,
      schedule: schedule || null,
    });

  } catch (err: any) {
    console.error("❌ by-invitation error:", err);

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}