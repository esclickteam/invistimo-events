import { NextResponse } from "next/server";
import db from "@/lib/db";
import Guest from "@/models/Guest";

export async function POST(req: Request, { params }: { params: { guestId: string } }) {
  try {
    await db();
    const body = await req.json();
    const { rsvp, guestsCount, notes } = body;

    const guest = await Guest.findByIdAndUpdate(
      params.guestId,
      { rsvp, guestsCount, notes },
      { new: true }
    );

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, guest });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
