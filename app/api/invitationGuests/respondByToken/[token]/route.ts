import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  try {
    await db();

    const body = await req.json();
    const { rsvp, guestsCount, notes, arrivedCount } = body;

    console.log("🟦 [respondByToken] token:", token);
    console.log("🟦 [respondByToken] body:", body);

    // ✅ ולידציה בסיסית ל-RSVP
    if (!rsvp || !["yes", "no", "pending"].includes(rsvp)) {
      console.log("🟥 invalid rsvp:", rsvp);
      return NextResponse.json(
        { success: false, error: "Invalid RSVP value" },
        { status: 400 }
      );
    }

    // ✅ עיבוד guestsCount
    let validatedGuestsCount = Number(guestsCount);
    if (rsvp === "no") validatedGuestsCount = 0;
    else if (!Number.isFinite(validatedGuestsCount) || validatedGuestsCount < 1)
      validatedGuestsCount = 1;

    // ✅ עיבוד arrivedCount (אם לא נשלח — קובע אוטומטית לפי מצב RSVP)
    let validatedArrivedCount: number;
    if (arrivedCount !== undefined) {
      const n = Number(arrivedCount);
      validatedArrivedCount =
        Number.isFinite(n) && n >= 0 ? n : validatedGuestsCount;
    } else {
      validatedArrivedCount = rsvp === "yes" ? validatedGuestsCount : 0;
    }

    // ✅ שליפת האורח ממונגו
    const guest = await InvitationGuest.findOne({ token });
    if (!guest) {
      console.log("🟥 Guest not found for token:", token);
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    console.log("🟨 BEFORE UPDATE:", {
      _id: guest._id?.toString(),
      rsvp: guest.rsvp,
      guestsCount: guest.guestsCount,
      arrivedCount: guest.arrivedCount,
      notes: guest.notes,
      updatedAt: guest.updatedAt,
    });

    // ✅ עדכון בפועל
    guest.rsvp = rsvp;
    guest.guestsCount = validatedGuestsCount;
    guest.arrivedCount = validatedArrivedCount;

    // ✅ notes — תומך גם במחרוזת וגם במערך
    if (notes !== undefined) {
      if (typeof notes === "string") guest.notes = notes;
      else if (Array.isArray(notes)) guest.notes = notes.join(", ");
      else guest.notes = "";
    }

    // ✅ שמירה
    await guest.save();

    // ✅ שליפה מחדש לווידוא
    const fresh = await InvitationGuest.findById(guest._id).lean();

    console.log("🟩 AFTER UPDATE:", {
      _id: fresh?._id?.toString(),
      rsvp: fresh?.rsvp,
      guestsCount: fresh?.guestsCount,
      arrivedCount: fresh?.arrivedCount,
      notes: fresh?.notes,
      updatedAt: fresh?.updatedAt,
    });

    return NextResponse.json({ success: true, guest: fresh }, { status: 200 });
  } catch (err) {
    console.error("❌ [respondByToken] error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
