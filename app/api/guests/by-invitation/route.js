import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json(
        { error: "invitationId missing" },
        { status: 400 }
      );
    }

    // מביא את כל האורחים של ההזמנה
    const guests = await InvitationGuest.find({
      invitationId,
    }).lean();

    return NextResponse.json({ guests });
  } catch (err) {
    console.error("❌ by-invitation error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
