import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);

    const invitationId = searchParams.get("invitationId");
    const type = searchParams.get("type");
    const round = searchParams.get("round");

    if (!invitationId) {
      return NextResponse.json(
        { error: "Missing invitationId" },
        { status: 400 }
      );
    }

    const schedule = await ScheduledMessage.findOne({
      invitationId,
      type,
      round: Number(round),
      status: { $in: ["scheduled", "sending"] }, // 🔥 חשוב
    }).lean();

    return NextResponse.json({
      success: true,
      schedule,
    });

  } catch (err: any) {
    console.error("❌ by-invitation error:", err);

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}