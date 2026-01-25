// app/api/guests/updateArrived/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const body = await req.json();
    const { guestId, increment } = body;

    if (!guestId || typeof increment !== "number") {
      return NextResponse.json(
        { success: false, message: "Missing or invalid parameters" },
        { status: 400 }
      );
    }

    const guest = await InvitationGuest.findById(guestId);
    if (!guest) {
      return NextResponse.json(
        { success: false, message: "Guest not found" },
        { status: 404 }
      );
    }

    guest.arrivedCount = Math.max(0, (guest.arrivedCount || 0) + increment);
    await guest.save();

    return NextResponse.json({ success: true, arrivedCount: guest.arrivedCount });
  } catch (err: any) {
    console.error("Update arrivedCount error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}
