import { NextResponse } from "next/server";
import db from "@/lib/db";
import Guest from "@/models/Guest";

export const dynamic = "force-dynamic"; // אופציונלי – למנוע caching

export async function POST(request: Request, context: any) {
  try {
    await db();

    const body = await request.json();
    const { rsvp, guestsCount, notes } = body;

    const guestId = context?.params?.guestId;
    if (!guestId) {
      return NextResponse.json({ error: "Missing guestId" }, { status: 400 });
    }

    const guest = await Guest.findByIdAndUpdate(
      guestId,
      { rsvp, guestsCount, notes },
      { new: true }
    );

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error("❌ Error in respond route:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
