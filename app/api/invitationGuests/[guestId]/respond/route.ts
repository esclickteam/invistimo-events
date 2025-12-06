import { NextResponse } from "next/server";
import db from "@/lib/db";
import Guest from "@/models/Guest";

type RSVP = "yes" | "no" | "pending";

export async function POST(
  req: Request,
  { params }: { params: { guestId: string } }
) {
  try {
    await db();

    const body = await req.json();
    const { rsvp, guestsCount, notes } = body as {
      rsvp?: RSVP;
      guestsCount?: number;
      notes?: string;
    };

    // ולידציה בסיסית
    if (rsvp && !["yes", "no", "pending"].includes(rsvp)) {
      return NextResponse.json(
        { error: "Invalid rsvp value" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (rsvp !== undefined) updateData.rsvp = rsvp;
    if (guestsCount !== undefined) updateData.guestsCount = guestsCount;
    if (notes !== undefined) updateData.notes = notes;

    const guest = await Guest.findByIdAndUpdate(
      params.guestId,
      updateData,
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
