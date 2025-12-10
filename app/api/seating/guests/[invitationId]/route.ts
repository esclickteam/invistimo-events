import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
export async function GET(
  req: Request,
  { params }: { params: { invitationId: string } }
) {
  try {
    await dbConnect();

    const guests = await InvitationGuest.find({
      invitationId: params.invitationId,
    }).lean();

    return NextResponse.json({
      success: true,
      guests,
    });
  } catch (err) {
    console.error("❌ Failed to load guests:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
